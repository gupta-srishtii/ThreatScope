import json

import pytest

from threatscope.ingestion import MAX_UPLOAD_BYTES, ImportErrorDetail, parse_events
from threatscope.synthetic import generate


def test_json_roundtrip():
    events = generate("baseline", count=20)
    assert (
        parse_events(json.dumps([e.model_dump(mode="json") for e in events]).encode(), "sample.json")
        == events
    )


@pytest.mark.parametrize(
    "data,name",
    [
        (b"[]", "x.json"),
        (b"{}", "x.json"),
        (b"[", "x.json"),
        (b"\xff", "x.csv"),
        (b"print('x')", "x.py"),
        (b"id,id\na,b", "x.csv"),
        (b"id,user\na,b,c", "x.csv"),
        (b"x" * (MAX_UPLOAD_BYTES + 1), "x.json"),
    ],
)
def test_rejects_malformed(data, name):
    with pytest.raises(ImportErrorDetail):
        parse_events(data, name)


def test_duplicates_and_invalid_row_are_atomic():
    event = generate("baseline", count=20)[0].model_dump(mode="json")
    with pytest.raises(ImportErrorDetail, match="duplicate"):
        parse_events(json.dumps([event, event]).encode(), "x.json")
    with pytest.raises(ImportErrorDetail, match="Row 2"):
        parse_events(json.dumps([event, {**event, "source_ip": "private-data"}]).encode(), "x.json")
