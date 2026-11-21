from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from threatscope.main import DB, dataset_or_404, require_access
from threatscope.schemas import NoteInput, StatusInput
from threatscope.storage import AlertRow, NoteRow

router = APIRouter(prefix="/api/datasets/{dataset_id}/alerts/{alert_id}", dependencies=[Depends(require_access)])


def alert_or_404(session, dataset_id, alert_id):
    dataset_or_404(session, dataset_id)
    row = session.get(AlertRow, (dataset_id, alert_id))
    if row is None:
        raise HTTPException(404, "Alert not found in this dataset")
    return row


def note_dict(row):
    return {"id": row.id, "alert_id": row.alert_id, "body": row.body, "created_at": row.created_at}


@router.patch("")
def update_status(dataset_id: str, alert_id: str, body: StatusInput, session: DB):
    row = alert_or_404(session, dataset_id, alert_id)
    row.status = body.status
    session.commit()
    return {**row.payload, "status": row.status}


@router.get("/notes")
def get_notes(dataset_id: str, alert_id: str, session: DB):
    alert_or_404(session, dataset_id, alert_id)
    return [note_dict(n) for n in session.scalars(select(NoteRow).where(
        NoteRow.dataset_id == dataset_id, NoteRow.alert_id == alert_id).order_by(NoteRow.created_at, NoteRow.id))]


@router.post("/notes", status_code=201)
def add_note(dataset_id: str, alert_id: str, body: NoteInput, session: DB):
    alert_or_404(session, dataset_id, alert_id)
    count = session.scalar(select(func.count()).select_from(NoteRow).where(
        NoteRow.dataset_id == dataset_id, NoteRow.alert_id == alert_id))
    if count >= 200:
        raise HTTPException(409, "Maximum 200 notes per alert")
    note = NoteRow(id=str(uuid4()), dataset_id=dataset_id, alert_id=alert_id, body=body.body,
                   created_at=datetime.now(timezone.utc))
    session.add(note)
    session.commit()
    return note_dict(note)
