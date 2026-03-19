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
    assert response.json() == {
        "service": "TWA Backend",
        "version": "0.1.0",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }


def test_api_v1_health() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "TWA Backend"
    assert payload["version"] == "0.1.0"
    assert "timestamp" in payload


def test_swagger_ui_is_available() -> None:
    response = client.get("/docs")

    assert response.status_code == 200
    assert "Swagger UI" in response.text


def test_openapi_json_is_available() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()
    assert payload["info"]["title"] == "TWA Backend"
    assert payload["info"]["version"] == "0.1.0"