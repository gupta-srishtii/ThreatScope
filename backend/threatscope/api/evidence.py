from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select

from threatscope.api.investigation import alert_or_404
from threatscope.dependencies import DB, dataset_or_404, require_access
from threatscope.models.storage import EventRow

router = APIRouter(prefix="/api/datasets/{dataset_id}", dependencies=[Depends(require_access)])


@router.get("/events/{event_id}")
def event_detail(dataset_id: str, event_id: str, session: DB):
    dataset_or_404(session, dataset_id)
    row = session.get(EventRow, (dataset_id, event_id))
    if row is None:
        raise HTTPException(404, "Event not found in this dataset")
    return row.payload


@router.get("/alerts/{alert_id}/events")
def evidence(
    dataset_id: str,
    alert_id: str,
    session: DB,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
):
    alert = alert_or_404(session, dataset_id, alert_id)
    filters = [EventRow.dataset_id == dataset_id, EventRow.id.in_(alert.payload["event_ids"])]
    total = session.scalar(select(func.count()).select_from(EventRow).where(*filters))
    rows = session.scalars(
        select(EventRow).where(*filters).order_by(EventRow.timestamp, EventRow.id).limit(limit).offset(offset)
    )
    return {"items": [r.payload for r in rows], "total": total, "limit": limit, "offset": offset}
