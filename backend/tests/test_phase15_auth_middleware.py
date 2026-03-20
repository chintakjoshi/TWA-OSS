from __future__ import annotations

import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from starlette.responses import JSONResponse

from app.core.config import get_settings
from app.core.middleware import JWTAuthMiddleware
from app.db.session import get_db_session
from app.main import create_app


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'phase15-auth.db'}"


@pytest.fixture()
def session_factory(sqlite_url: str):
    from app.db.base import Base

    engine = create_engine(sqlite_url)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    try:
        yield factory
    finally:
        engine.dispose()


def test_auth_middleware_bypasses_public_routes_and_accepts_token_backed_identity(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    dispatch_calls: list[str] = []

    async def fake_dispatch(self, request, call_next):  # noqa: ANN001
        dispatch_calls.append(request.url.path)
        if "authorization" not in request.headers:
            return JSONResponse(
                status_code=401,
                content={
                    "error": {"code": "UNAUTHENTICATED", "message": "Missing token."}
                },
            )
        request.state.user = {
            "type": "user",
            "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "email": "user@example.com",
            "role": "user",
        }
        return await call_next(request)

    monkeypatch.setattr(JWTAuthMiddleware, "dispatch", fake_dispatch)
    monkeypatch.setenv("TWA_AUTH_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session

    with TestClient(app) as client:
        public_response = client.get("/health")
        missing_token_response = client.get("/api/v1/auth/me")
        authenticated_response = client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer test-token"}
        )

    assert public_response.status_code == 200
    assert missing_token_response.status_code == 401
    assert missing_token_response.json()["error"]["code"] == "UNAUTHENTICATED"
    assert authenticated_response.status_code == 200
    assert authenticated_response.json() == {
        "app_user": None,
        "profile_complete": False,
        "employer_review_status": None,
        "next_step": "bootstrap_role",
    }
    assert dispatch_calls == ["/api/v1/auth/me", "/api/v1/auth/me"]

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_auth_middleware_allows_cors_preflight_without_authentication(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    dispatch_calls: list[str] = []

    async def fake_dispatch(self, request, call_next):  # noqa: ANN001
        dispatch_calls.append(request.url.path)
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "UNAUTHENTICATED", "message": "Missing token."}},
        )

    monkeypatch.setattr(JWTAuthMiddleware, "dispatch", fake_dispatch)
    monkeypatch.setenv("TWA_AUTH_ENABLED", "true")
    monkeypatch.setenv("TWA_CORS_ORIGINS", "http://localhost:5175")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session

    with TestClient(app) as client:
        response = client.options(
            "/api/v1/auth/me",
            headers={
                "Origin": "http://localhost:5175",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5175"
    assert "authorization" in response.headers["access-control-allow-headers"]
    assert dispatch_calls == []

    app.dependency_overrides.clear()
    get_settings.cache_clear()
