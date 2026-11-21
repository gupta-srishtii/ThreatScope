"""Bounded all-or-nothing CSV/JSON parsing; uploads are never executed."""

import csv
import io
import json
from pathlib import PurePath

from pydantic import ValidationError

from threatscope.schemas import Event

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
MAX_EVENTS = 10000


class ImportErrorDetail(ValueError):
    pass


def parse_events(content: bytes, filename: str) -> list[Event]:
    if len(content) > MAX_UPLOAD_BYTES:
        raise ImportErrorDetail("File exceeds the 2 MiB limit")
    suffix = PurePath(filename).suffix.lower()
    if suffix not in (".csv", ".json"):
        raise ImportErrorDetail("Only .csv and .json files are accepted")
    try:
        text = content.decode("utf-8-sig")
        if suffix == ".json":
            rows = json.loads(text)
            if not isinstance(rows, list):
                raise ImportErrorDetail("JSON must be an array of event objects")
        else:
            reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
            headers = reader.fieldnames
            if not headers or len(headers) != len(set(headers)):
                raise ImportErrorDetail("CSV headers must be present and unique")
            rows = []
            for row in reader:
                if None in row or any(v is None for v in row.values()):
                    raise ImportErrorDetail("CSV row has missing or extra columns")
                if "bytes_sent" in row:
                    row["bytes_sent"] = int(row["bytes_sent"]) if row["bytes_sent"] else 0
                if row.get("label") == "":
                    row["label"] = None
                rows.append(row)
                if len(rows) > MAX_EVENTS:
                    raise ImportErrorDetail("Maximum 10000 events per dataset")
        if not rows or len(rows) > MAX_EVENTS:
            raise ImportErrorDetail("A dataset must contain between 1 and 10000 events")
        events = []
        seen = set()
        for index, row in enumerate(rows):
            try:
                event = Event.model_validate(row)
            except ValidationError as exc:
                # Do not echo raw uploaded values back into logs or API errors.
                location = ".".join(str(x) for x in exc.errors()[0]["loc"])
                raise ImportErrorDetail(f"Row {index + 1}: invalid {location or 'event'}") from exc
            if event.id in seen:
                raise ImportErrorDetail(f"Row {index + 1}: duplicate event ID")
            seen.add(event.id)
            events.append(event)
        return sorted(events, key=lambda e: (e.timestamp, e.id))
    except ImportErrorDetail:
        raise
    except (UnicodeError, ValueError, csv.Error, TypeError, RecursionError) as exc:
        raise ImportErrorDetail("Malformed file: expected UTF-8 CSV or JSON events") from exc
