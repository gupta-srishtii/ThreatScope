from contextlib import asynccontextmanager
from hmac import compare_digest
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from threatscope.config import Settings
from threatscope.ingestion import MAX_UPLOAD_BYTES, ImportErrorDetail, parse_events
from threatscope.security import RequestGuard
from threatscope.storage import DatasetRow, database, save_dataset
from threatscope.synthetic import SCENARIOS, generate


def get_session(request: Request):
    with request.app.state.sessions() as session:
        yield session


DB = Annotated[Session, Depends(get_session)]


def require_access(request: Request):
    key = request.app.state.settings.api_key
    if key and not compare_digest(request.headers.get("X-API-Key", ""), key):
        raise HTTPException(401, "A valid workspace API key is required")


def dataset_or_404(session: Session, dataset_id: str) -> DatasetRow:
    row = session.get(DatasetRow, dataset_id)
    if row is None:
        raise HTTPException(404, "Dataset not found")
    return row


def check_quota(session: Session):
    if session.scalar(select(func.count()).select_from(DatasetRow)) >= 50:
        raise HTTPException(409, "Workspace limit reached (50 datasets). Remove an unused dataset first.")


def dataset_dict(row: DatasetRow):
    return {"id": row.id, "name": row.name, "source": row.source,
            "created_at": row.created_at, "event_count": row.event_count}


class ScenarioInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: str = "mixed"
    seed: int = Field(default=42, ge=0, le=1000000)


router = APIRouter(prefix="/api", dependencies=[Depends(require_access)])


@router.get("/scenarios")
def scenarios():
    return [{"id": key, "description": description} for key, description in SCENARIOS.items()]


@router.get("/datasets")
def datasets(session: DB):
    return [dataset_dict(r) for r in session.scalars(select(DatasetRow).order_by(DatasetRow.created_at.desc()))]


@router.post("/datasets/scenario", status_code=201)
def create_scenario(body: ScenarioInput, session: DB):
    check_quota(session)
    if body.scenario not in SCENARIOS:
        raise HTTPException(422, "Unknown synthetic scenario")
    row = save_dataset(session, f"{body.scenario.replace('_', ' ').title()} · seed {body.seed}",
                       "synthetic", generate(body.scenario, body.seed))
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

    app = FastAPI(title="ThreatScope API", version="0.1.0", lifespan=lifespan,
                  docs_url="/docs" if settings.environment != "production" else None,
                  redoc_url=None, openapi_url="/openapi.json" if settings.environment != "production" else None)
    app.state.settings = settings
    app.add_middleware(RequestGuard, origins=settings.origins)
    app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_methods=["GET", "POST", "PATCH", "DELETE"],
                       allow_headers=["Content-Type", "X-API-Key"])
    app.include_router(router)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": "0.1.0", "mode": "defensive-analysis"}

    return app


app = create_app()
