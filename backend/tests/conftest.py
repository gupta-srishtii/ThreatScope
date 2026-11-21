import pytest
from fastapi.testclient import TestClient

from threatscope.config import Settings
from threatscope.main import create_app


@pytest.fixture
def client():
    app = create_app(Settings(database_url="sqlite://", environment="test", api_key="test-key"))
    with TestClient(app) as client:
        client.headers["X-API-Key"] = "test-key"
        yield client


@pytest.fixture
def dataset(client):
    return client.post("/api/datasets/scenario", json={"scenario": "mixed"}).json()
