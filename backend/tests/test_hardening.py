import csv
import io
import json

import pytest

from threatscope.config import Settings
from threatscope.ingestion import ImportErrorDetail, parse_events
from threatscope.synthetic import generate


def test_csv_bom_round_trip_and_invalid_numeric_fields():
    events = generate("baseline", count=20)
    output = io.StringIO(newline="")
    rows = [e.model_dump(mode="json") for e in events]
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    encoded = output.getvalue().encode("utf-8-sig")
    assert parse_events(encoded, "events.CSV") == events
    malformed = output.getvalue().replace(str(rows[0]["bytes_sent"]), "1.5", 1)
    with pytest.raises(ImportErrorDetail):
        parse_events(malformed.encode(), "events.csv")


def test_record_limit_and_deeply_nested_json():
    event = generate("baseline", count=20)[0].model_dump(mode="json")
    # Tiny records hit the count guard independently of the byte-size guard.
    with pytest.raises(ImportErrorDetail, match="10000"):
        parse_events(json.dumps([{}] * 10001).encode(), "events.json")
    with pytest.raises(ImportErrorDetail):
        parse_events(("[" * 2000 + "]" * 2000).encode(), "events.json")
    assert parse_events(json.dumps([event]).encode(), "events.json")


def test_render_postgres_urls_use_installed_driver():
    for value in ("postgres://user:placeholder@localhost/db", "postgresql://user:placeholder@localhost/db"):
        assert Settings(database_url=value).database_url.startswith("postgresql+psycopg://")


def test_cors_preflight_allows_only_explicit_origins(client):
    accepted = client.options(
        "/api/datasets",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-API-Key",
        },
    )
    assert accepted.status_code == 200
    assert accepted.headers["access-control-allow-origin"] == "http://localhost:5173"
    denied = client.options(
        "/api/datasets",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in denied.headers
