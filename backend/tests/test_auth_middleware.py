from __future__ import annotations

import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sdk.client import AuthClient as SDKAuthClient
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
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'auth-middleware.db'}"


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
    async def fake_verify_with_refresh(self, token: str):  # noqa: ANN001
        assert token == "test-token"
        return {
            "sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "email": "user@example.com",
            "email_verified": True,
            "email_otp_enabled": False,
            "role": "user",
            "type": "access",
            "aud": "twa-api",
            "auth_time": 1710000000,
        }

    async def fake_validate_access_token_session(
        self, token: str
    ) -> None:  # noqa: ANN001
        assert token == "test-token"

    monkeypatch.setattr(
        JWTAuthMiddleware, "_verify_with_refresh", fake_verify_with_refresh
    )
    monkeypatch.setattr(
        SDKAuthClient,
        "validate_access_token_session",
        fake_validate_access_token_session,
    )
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
    assert missing_token_response.json()["code"] == "invalid_token"
    assert authenticated_response.status_code == 200
    assert authenticated_response.json() == {
        "app_user": None,
        "profile_complete": False,
        "email_otp_enabled": False,
        "employer_review_status": None,
        "employer_capabilities": None,
        "next_step": "bootstrap_role",
    }

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
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
    assert dispatch_calls == []

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_auth_middleware_accepts_cookie_authenticated_identity_without_bearer_header(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    async def fake_verify_with_refresh(self, token: str):  # noqa: ANN001
        assert token == "cookie-access-token"
        return {
            "sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "email": "user@example.com",
            "email_verified": True,
            "email_otp_enabled": False,
            "role": "user",
            "type": "access",
            "aud": "twa-api",
            "auth_time": 1710000000,
        }

    async def fake_validate_access_token_session(
        self, token: str
    ) -> None:  # noqa: ANN001
        assert token == "cookie-access-token"

    monkeypatch.setattr(
        JWTAuthMiddleware, "_verify_with_refresh", fake_verify_with_refresh
    )
    monkeypatch.setattr(
        SDKAuthClient,
        "validate_access_token_session",
        fake_validate_access_token_session,
    )
    monkeypatch.setenv("TWA_AUTH_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session

    with TestClient(app) as client:
        client.cookies.set("twa_auth_access", "cookie-access-token")
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json() == {
        "app_user": None,
        "profile_complete": False,
        "email_otp_enabled": False,
        "employer_review_status": None,
        "employer_capabilities": None,
        "next_step": "bootstrap_role",
    }

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_auth_middleware_rejects_unsafe_cookie_authenticated_requests_without_csrf(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    async def fake_verify_with_refresh(self, token: str):  # noqa: ANN001
        assert token == "cookie-access-token"
        return {
            "sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "email": "user@example.com",
            "email_verified": True,
            "email_otp_enabled": False,
            "role": "user",
            "type": "access",
            "aud": "twa-api",
            "auth_time": 1710000000,
        }

    async def fake_validate_access_token_session(
        self, token: str
    ) -> None:  # noqa: ANN001
        assert token == "cookie-access-token"

    monkeypatch.setattr(
        JWTAuthMiddleware, "_verify_with_refresh", fake_verify_with_refresh
    )
    monkeypatch.setattr(
        SDKAuthClient,
        "validate_access_token_session",
        fake_validate_access_token_session,
    )
    monkeypatch.setenv("TWA_AUTH_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session

    with TestClient(app) as client:
        client.cookies.set("twa_auth_access", "cookie-access-token")
        missing_csrf = client.post(
            "/api/v1/auth/bootstrap",
            json={"role": "jobseeker"},
        )
        client.cookies.set("twa_auth_csrf", "csrf-token")
        valid_csrf = client.post(
            "/api/v1/auth/bootstrap",
            json={"role": "jobseeker"},
            headers={"X-CSRF-Token": "csrf-token"},
        )

    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["code"] == "invalid_csrf_token"
    assert valid_csrf.status_code == 200
    assert valid_csrf.json()["app_user"]["app_role"] == "jobseeker"

    app.dependency_overrides.clear()
    get_settings.cache_clear()
