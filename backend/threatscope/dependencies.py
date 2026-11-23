"""Shared API dependencies; routers do not import the application entry point."""

from datetime import timezone
from hmac import compare_digest
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from threatscope.models.storage import DatasetRow


def get_session(request: Request):
    with request.app.state.sessions() as session:
        yield session


DB = Annotated[Session, Depends(get_session)]


def require_access(request: Request):
    key = request.app.state.settings.api_key
    if key and not compare_digest(request.headers.get("X-API-Key", "").encode(), key.encode()):
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
    created_at = row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=timezone.utc)
    return {
        "id": row.id,
        "name": row.name,
        "source": row.source,
        "created_at": created_at,
        "event_count": row.event_count,
    }
