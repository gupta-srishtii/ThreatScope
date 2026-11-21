import csv
import io
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select

from threatscope.investigation_api import note_dict
from threatscope.main import DB, dataset_dict, dataset_or_404, require_access
from threatscope.query_api import metrics
from threatscope.storage import NoteRow, load_alerts, load_events

router = APIRouter(prefix="/api/datasets/{dataset_id}", dependencies=[Depends(require_access)])


def spreadsheet_safe(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


@router.get("/report")
def report(dataset_id: str, session: DB, format: Literal["json", "csv"] = "json"):
    dataset = dataset_or_404(session, dataset_id)
    headers = {"Content-Disposition": f'attachment; filename="threatscope-{dataset_id}.{format}"',
               "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
    if format == "csv":
        events = load_events(session, dataset_id)
        output = io.StringIO(newline="")
        rows = [e.model_dump(mode="json") for e in events]
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows({k: spreadsheet_safe(v) for k, v in row.items()} for row in rows)
        return Response(output.getvalue(), media_type="text/csv; charset=utf-8", headers=headers)
    notes = session.scalars(select(NoteRow).where(NoteRow.dataset_id == dataset_id).order_by(NoteRow.created_at))
    payload = {"schema_version": 1, "generated_at": datetime.now(timezone.utc),
               "dataset": dataset_dict(dataset), "metrics": metrics(dataset_id, session),
               "alerts": load_alerts(session, dataset_id), "notes": [note_dict(n) for n in notes],
               "limitations": ["Detections are investigation leads, not confirmed malicious activity.",
                               "Synthetic demonstrations do not measure operational security effectiveness.",
                               "JSON contains all alert evidence references; CSV contains all normalized events."]}
    return JSONResponse(jsonable_encoder(payload), headers=headers)
