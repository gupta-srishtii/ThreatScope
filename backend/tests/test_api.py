import pytest
from pydantic import ValidationError

from threatscope.config import Settings


def test_health_and_auth(client):
    client.headers.pop("X-API-Key")
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/datasets").status_code == 401
    assert client.post("/api/datasets/scenario", json={}).status_code == 401


def test_dataset_lifecycle(client, dataset):
    assert dataset["event_count"] == 527
    assert dataset["source"] == "synthetic"
    assert len(client.get("/api/datasets").json()) == 1
    assert client.delete(f"/api/datasets/{dataset['id']}").status_code == 204
    assert client.get("/api/datasets").json() == []
    assert client.delete(f"/api/datasets/{dataset['id']}").status_code == 404


def test_unknown_scenario(client):
    assert client.post("/api/datasets/scenario", json={"scenario": "unknown"}).status_code == 422


def test_production_settings_fail_closed():
    with pytest.raises(ValidationError):
        Settings(environment="production", api_key="")
    with pytest.raises(ValidationError):
        Settings(environment="production", api_key="x" * 32, allowed_origins="*")
