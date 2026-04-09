from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "TWA Backend"
    assert payload["version"] == "0.1.0"
    assert "timestamp" in payload


def test_api_v1_root() -> None:
    response = client.get("/api/v1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "TWA Backend"
    assert payload["version"] == "0.1.0"
    assert "docs_url" in payload
    assert "openapi_url" in payload


def test_api_v1_health() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "TWA Backend"
    assert payload["version"] == "0.1.0"
    assert "timestamp" in payload
