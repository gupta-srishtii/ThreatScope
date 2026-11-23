import json

from threatscope.services.ingestion import MAX_UPLOAD_BYTES
from threatscope.services.synthetic import generate


def test_valid_import(client):
    payload = json.dumps([e.model_dump(mode="json") for e in generate("baseline", count=20)])
    response = client.post(
        "/api/datasets/upload", files={"file": ("sample.json", payload, "application/json")}
    )
    assert response.status_code == 201
    assert response.json()["event_count"] == 20


def test_failed_import_creates_nothing(client):
    for name, content in [("bad.json", "[{}]"), ("bad.py", "print('no')"), ("empty.csv", "id,user")]:
        assert client.post("/api/datasets/upload", files={"file": (name, content)}).status_code == 422
    assert client.get("/api/datasets").json() == []


def test_request_body_limit_and_origin(client):
    assert client.post("/api/datasets/upload", content=b"x" * (MAX_UPLOAD_BYTES + 65537)).status_code == 413
    assert (
        client.post("/api/datasets/scenario", json={}, headers={"Origin": "https://evil.example"}).status_code
        == 403
    )


def test_body_limit_without_content_length(client):
    def chunks():
        for _ in range(35):
            yield b"x" * 65536

    assert client.post("/api/datasets/upload", content=chunks()).status_code == 413
