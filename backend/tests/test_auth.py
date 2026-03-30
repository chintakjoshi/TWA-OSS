from __future__ import annotations

import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.auth import require_role
from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import AppUser, Employer, Jobseeker, NotificationConfig
from app.models.enums import AppRole
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'test.db'}"


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


@pytest.fixture()
def auth_identity() -> AuthProviderIdentity:
    return AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="user@example.com",
        auth_provider_role="user",
    )


@pytest.fixture()
def client(
    monkeypatch: pytest.MonkeyPatch,
    session_factory,
    auth_identity: AuthProviderIdentity,
) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return auth_identity

    @app.get("/_test/staff")
    def test_staff_route(_: object = Depends(require_role("staff"))) -> dict[str, bool]:
        return {"ok": True}

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    get_settings.cache_clear()


@pytest.fixture()
def session(session_factory) -> Generator[Session, None, None]:
    with session_factory() as session:
        yield session


def test_auth_me_returns_bootstrap_step_for_unbootstrapped_user(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json() == {
        "app_user": None,
        "profile_complete": False,
        "employer_review_status": None,
        "next_step": "bootstrap_role",
    }


def test_public_portals_allow_unbootstrapped_authenticated_users(
    client: TestClient,
) -> None:
    jobseeker_response = client.get("/api/v1/auth/me?portal=jobseeker")
    employer_response = client.get("/api/v1/auth/me?portal=employer")

    assert jobseeker_response.status_code == 200
    assert employer_response.status_code == 200


def test_staff_portal_rejects_unbootstrapped_authenticated_users(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/auth/me?portal=staff")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PORTAL_ACCESS_DENIED"


def test_bootstrap_jobseeker_creates_local_user_and_profile(
    client: TestClient, session: Session
) -> None:
    response = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["app_user"]["email"] == "user@example.com"
    assert payload["app_user"]["app_role"] == "jobseeker"
    assert payload["next_step"] == "complete_jobseeker_profile"

    app_user = session.execute(select(AppUser)).scalar_one()
    jobseeker = session.execute(select(Jobseeker)).scalar_one()
    assert app_user.app_role == AppRole.JOBSEEKER
    assert jobseeker.app_user_id == app_user.id


def test_bootstrap_employer_requires_profile(client: TestClient) -> None:
    response = client.post("/api/v1/auth/bootstrap", json={"role": "employer"})

    assert response.status_code == 422


def test_bootstrap_employer_creates_pending_employer_profile(
    client: TestClient, session: Session
) -> None:
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {
                "org_name": "Northside Logistics",
                "contact_name": "Sam Carter",
                "phone": "3145550199",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["app_user"]["app_role"] == "employer"
    assert payload["next_step"] == "await_staff_approval"

    employer = session.execute(select(Employer)).scalar_one()
    assert employer.org_name == "Northside Logistics"
    assert employer.review_status.value == "pending"


def test_bootstrap_rejects_role_conflicts(client: TestClient) -> None:
    first = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    second = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "CONFLICT"


def test_bootstrap_blocks_non_end_user_role(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return AuthProviderIdentity(
            auth_user_id=uuid.uuid4(),
            email="admin@example.com",
            auth_provider_role="admin",
        )

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/auth/bootstrap", json={"role": "jobseeker"}
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
    get_settings.cache_clear()


def test_auth_me_returns_employer_review_context(client: TestClient) -> None:
    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["app_user"]["app_role"] == "employer"
    assert payload["profile_complete"] is True
    assert payload["employer_review_status"] == "pending"
    assert payload["next_step"] == "await_staff_approval"


def test_auth_me_rejects_cross_portal_access_without_leaking_role(
    client: TestClient,
) -> None:
    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200

    response = client.get("/api/v1/auth/me?portal=employer")

    assert response.status_code == 403
    payload = response.json()
    assert payload["error"]["code"] == "PORTAL_ACCESS_DENIED"
    assert (
        payload["error"]["message"] == "This account is not authorized for this portal."
    )


def test_require_role_blocks_non_staff_users(client: TestClient) -> None:
    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200

    response = client.get("/_test/staff")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_require_role_allows_staff_users(
    monkeypatch: pytest.MonkeyPatch, session_factory
) -> None:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    get_settings.cache_clear()
    app = create_app()

    staff_identity = AuthProviderIdentity(
        auth_user_id=uuid.uuid4(),
        email="staff@example.com",
        auth_provider_role="admin",
    )

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            config = session.get(NotificationConfig, 1)
            if config is None:
                session.add(NotificationConfig(id=1))
                session.flush()
            user = session.execute(
                select(AppUser).where(
                    AppUser.auth_user_id == staff_identity.auth_user_id
                )
            ).scalar_one_or_none()
            if user is None:
                session.add(
                    AppUser(
                        auth_user_id=staff_identity.auth_user_id,
                        email=staff_identity.email,
                        auth_provider_role=staff_identity.auth_provider_role,
                        app_role=AppRole.STAFF,
                        is_active=True,
                    )
                )
                session.commit()
            yield session

    def override_identity() -> AuthProviderIdentity:
        return staff_identity

    @app.get("/_test/staff")
    def test_staff_route(_: object = Depends(require_role("staff"))) -> dict[str, bool]:
        return {"ok": True}

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as test_client:
        response = test_client.get("/_test/staff")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    get_settings.cache_clear()
