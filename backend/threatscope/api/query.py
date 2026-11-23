from collections import Counter
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from threatscope.dependencies import DB, dataset_or_404, require_access
from threatscope.models.schemas import Severity
from threatscope.models.storage import EventRow, load_alerts, load_events

router = APIRouter(prefix="/api/datasets/{dataset_id}", dependencies=[Depends(require_access)])


@router.get("/events")
def events(
    dataset_id: str,
    session: DB,
    q: Annotated[str, Query(max_length=120)] = "",
    severity: Severity | None = None,
    action: Literal["login", "file_access", "process_start", "network_connection"] | None = None,
    outcome: Literal["success", "failure", "allowed", "blocked"] | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    dataset_or_404(session, dataset_id)
    filters = [EventRow.dataset_id == dataset_id]
    if q:
        filters.append(EventRow.search_text.contains(q.lower(), autoescape=True))
    for column, value in [
        (EventRow.severity, severity),
        (EventRow.action, action),
        (EventRow.outcome, outcome),
    ]:
        if value:
            filters.append(column == value)
    for value in (start, end):
        if value and (value.tzinfo is None or value.utcoffset() is None):
            from fastapi import HTTPException

            raise HTTPException(422, "Date filters must include a timezone")
    if start:
        filters.append(EventRow.timestamp >= start.astimezone(timezone.utc))
    if end:
        filters.append(EventRow.timestamp <= end.astimezone(timezone.utc))
    total = session.scalar(select(func.count()).select_from(EventRow).where(*filters))
    rows = session.scalars(
        select(EventRow)
        .where(*filters)
        .order_by(EventRow.timestamp.desc(), EventRow.id)
        .offset(offset)
        .limit(limit)
    )
    return {"items": [r.payload for r in rows], "total": total, "offset": offset, "limit": limit}


@router.get("/alerts")
def alerts(dataset_id: str, session: DB):
    dataset_or_404(session, dataset_id)
    return load_alerts(session, dataset_id)


@router.get("/metrics")
def metrics(dataset_id: str, session: DB):
    dataset_or_404(session, dataset_id)
    evts = load_events(session, dataset_id)
    alerts = load_alerts(session, dataset_id)
    flagged = {eid for alert in alerts for eid in alert.event_ids}
    logins = [e for e in evts if e.action == "login"]
    failures = sum(e.outcome == "failure" for e in logins)
    first, last = evts[0].timestamp, evts[-1].timestamp
    width = max(60, ceil(((last - first).total_seconds() + 1) / 36))
    timeline = {}
    for e in evts:
        bucket = int((e.timestamp - first).total_seconds()) // width
        row = timeline.setdefault(
            bucket,
            {
                "timestamp": (first + timedelta(seconds=bucket * width)).isoformat(),
                "events": 0,
                "flagged": 0,
                "failures": 0,
            },
        )
        row["events"] += 1
        row["flagged"] += int(e.id in flagged)
        row["failures"] += int(e.action == "login" and e.outcome == "failure")
    # Include empty bins so gaps are represented honestly in the timeline.
    bins = [
        {
            "timestamp": (first + timedelta(seconds=i * width)).isoformat(),
            "events": 0,
            "flagged": 0,
            "failures": 0,
        }
        for i in range(max(timeline) + 1)
    ]
    for key, value in timeline.items():
        bins[key] = value
    return {
        "total_events": len(evts),
        "total_alerts": len(alerts),
        "open_alerts": sum(a.status != "resolved" for a in alerts),
        "unique_sources": len({e.source_ip for e in evts}),
        "failed_logins": failures,
        "failure_rate": round(failures / len(logins) * 100, 2) if logins else 0,
        "flagged_events": len(flagged),
        "bytes_sent": sum(e.bytes_sent for e in evts),
        "severity": dict(Counter(a.severity.value for a in alerts)),
        "timeline": bins,
        "window_start": first,
        "window_end": last,
        "bucket_seconds": width,
    }
