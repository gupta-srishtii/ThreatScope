from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from threatscope.config import Settings
from threatscope.dependencies import DB, check_quota, dataset_dict, dataset_or_404, require_access
from threatscope.models.storage import DatasetRow, database, save_dataset
from threatscope.security import RequestGuard
from threatscope.services.ingestion import MAX_UPLOAD_BYTES, ImportErrorDetail, parse_events
from threatscope.services.synthetic import SCENARIOS, generate


class ScenarioInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: str = "mixed"
    seed: int = Field(default=42, ge=0, le=1000000, strict=True)


router = APIRouter(prefix="/api", dependencies=[Depends(require_access)])


@router.get("/scenarios")
def scenarios():
    return [{"id": key, "description": description} for key, description in SCENARIOS.items()]


@router.get("/datasets")
def datasets(session: DB):
    return [
        dataset_dict(r) for r in session.scalars(select(DatasetRow).order_by(DatasetRow.created_at.desc()))
    ]


@router.post("/datasets/scenario", status_code=201)
def create_scenario(body: ScenarioInput, session: DB):
    check_quota(session)
    if body.scenario not in SCENARIOS:
        raise HTTPException(422, "Unknown synthetic scenario")
    row = save_dataset(
        session,
        f"{body.scenario.replace('_', ' ').title()} · seed {body.seed}",
        "synthetic",
        generate(body.scenario, body.seed),
    )
    return dataset_dict(row)


@router.delete("/datasets/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: str, session: DB):
    session.delete(dataset_or_404(session, dataset_id))
    session.commit()


@router.post("/datasets/upload", status_code=201)
def upload_dataset(file: UploadFile, session: DB):
    check_quota(session)
    try:
        content = file.file.read(MAX_UPLOAD_BYTES + 1)
        events = parse_events(content, file.filename or "")
    except ImportErrorDetail as exc:
        raise HTTPException(413 if len(content) > MAX_UPLOAD_BYTES else 422, str(exc)) from exc
    finally:
        file.file.close()
    # A generic name avoids treating an untrusted filename as a path or UI markup.
    return dataset_dict(save_dataset(session, "Imported security events", "upload", events))


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        engine, sessions = database(settings.database_url)
        app.state.sessions = sessions
        yield
        engine.dispose()

    app = FastAPI(
        title="ThreatScope API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.environment != "production" else None,
    )
    app.state.settings = settings

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        errors = [{"loc": item["loc"], "type": item["type"], "msg": item["msg"]} for item in error.errors()]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.middleware("http")
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    app.add_middleware(RequestGuard, origins=settings.origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-API-Key"],
    )
    app.include_router(router)
    from threatscope.api.query import router as query_router

    app.include_router(query_router)
    from threatscope.api.investigation import router as investigation_router

    app.include_router(investigation_router)
    from threatscope.api.ml import router as ml_router
    from threatscope.api.reports import router as reports_router

    app.include_router(ml_router)
    app.include_router(reports_router)
    from threatscope.api.evidence import router as evidence_router

    app.include_router(evidence_router)

    @app.get("/api/health")
    def health(session: DB):
        try:
            session.scalar(select(1))
        except SQLAlchemyError as exc:
            raise HTTPException(503, "Database unavailable") from exc
        return {"status": "ok", "version": "0.1.0", "mode": "defensive-analysis"}

    return app


app = create_app()
