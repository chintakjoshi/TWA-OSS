from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture()
def dev_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DOCS_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client
    get_settings.cache_clear()


@pytest.fixture()
def prod_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DOCS_ENABLED", "false")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client
    get_settings.cache_clear()


class TestDocsInDevelopment:
    def test_swagger_ui_available(self, dev_client: TestClient) -> None:
        response = dev_client.get("/docs")
        assert response.status_code == 200

    def test_redoc_available(self, dev_client: TestClient) -> None:
        response = dev_client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_json_available(self, dev_client: TestClient) -> None:
        response = dev_client.get("/openapi.json")
        assert response.status_code == 200

    def test_api_root_shows_docs_urls(self, dev_client: TestClient) -> None:
        response = dev_client.get("/api/v1")
        assert response.status_code == 200
        payload = response.json()
        assert payload["docs_url"] == "/docs"
        assert payload["openapi_url"] == "/openapi.json"


class TestDocsInProduction:
    def test_swagger_ui_disabled(self, prod_client: TestClient) -> None:
        response = prod_client.get("/docs")
        assert response.status_code == 404

    def test_redoc_disabled(self, prod_client: TestClient) -> None:
        response = prod_client.get("/redoc")
        assert response.status_code == 404

    def test_openapi_json_disabled(self, prod_client: TestClient) -> None:
        response = prod_client.get("/openapi.json")
        assert response.status_code == 404

    def test_api_root_shows_null_docs_urls(self, prod_client: TestClient) -> None:
        response = prod_client.get("/api/v1")
        assert response.status_code == 200
        payload = response.json()
        assert payload["docs_url"] is None
        assert payload["openapi_url"] is None
