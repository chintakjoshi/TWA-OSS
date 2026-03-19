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

from app.core.auth import require_completed_jobseeker
from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import AppUser, Application, Employer, JobListing, Jobseeker
from app.models.enums import (
    AppRole,
    ApplicationStatus,
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    TransitRequirement,
)
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'phase7.db'}"


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
def phase7_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    state = {
        "identity": AuthProviderIdentity(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="jobseeker@example.com",
            auth_provider_role="user",
        )
    }

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return state["identity"]

    @app.get("/_test/completed-jobseeker")
    def completed_jobseeker_route(_: object = Depends(require_completed_jobseeker)) -> dict[str, bool]:
        return {"ok": True}

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, state, session_factory

    app.dependency_overrides.clear()
    get_settings.cache_clear()



def seed_staff(session_factory, *, auth_user_id: uuid.UUID | None = None) -> AppUser:
    auth_user_id = auth_user_id or uuid.uuid4()
    with session_factory() as session:
        staff = AppUser(
            auth_user_id=auth_user_id,
            email="staff@example.com",
            auth_provider_role="admin",
            app_role=AppRole.STAFF,
            is_active=True,
        )
        session.add(staff)
        session.commit()
        session.refresh(staff)
        return staff



def seed_application_for_jobseeker(session_factory, *, jobseeker_auth_user_id: uuid.UUID) -> Jobseeker:
    with session_factory() as session:
        jobseeker_user = session.execute(select(AppUser).where(AppUser.auth_user_id == jobseeker_auth_user_id)).scalar_one()
        jobseeker = session.execute(select(Jobseeker).where(Jobseeker.app_user_id == jobseeker_user.id)).scalar_one()

        employer_user = AppUser(
            auth_user_id=uuid.uuid4(),
            email="employer@example.com",
            auth_provider_role="user",
            app_role=AppRole.EMPLOYER,
            is_active=True,
        )
        session.add(employer_user)
        session.flush()

        employer = Employer(
            app_user_id=employer_user.id,
            org_name="Northside Logistics",
            review_status=EmployerReviewStatus.APPROVED,
        )
        session.add(employer)
        session.flush()

        listing = JobListing(
            employer_id=employer.id,
            title="Warehouse Associate",
            transit_required=TransitRequirement.ANY,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        session.add(listing)
        session.flush()

        application = Application(
            jobseeker_id=jobseeker.id,
            job_listing_id=listing.id,
            status=ApplicationStatus.SUBMITTED,
        )
        session.add(application)
        session.commit()
        session.refresh(jobseeker)
        return jobseeker



def test_jobseeker_profile_completion_flow(phase7_env) -> None:
    client, state, _ = phase7_env

    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200

    me = client.get("/api/v1/jobseekers/me")
    assert me.status_code == 200
    assert me.json()["profile"]["profile_complete"] is False

    blocked = client.get("/_test/completed-jobseeker")
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "PROFILE_INCOMPLETE"

    patch_me = client.patch(
        "/api/v1/jobseekers/me",
        json={
            "full_name": "Jane Doe",
            "phone": "3145550101",
            "address": "123 Main St",
            "city": "St. Louis",
            "zip": "63103",
            "transit_type": "public_transit",
            "charges": {"drug": True},
        },
    )
    assert patch_me.status_code == 200
    assert patch_me.json()["profile"]["profile_complete"] is True

    completed = client.get("/_test/completed-jobseeker")
    assert completed.status_code == 200
    assert completed.json() == {"ok": True}

    auth_me = client.get("/api/v1/auth/me")
    assert auth_me.status_code == 200
    assert auth_me.json()["profile_complete"] is True
    assert auth_me.json()["next_step"] is None

    profile = client.get("/api/v1/jobseekers/me")
    assert profile.status_code == 200
    payload = profile.json()["profile"]
    assert payload["full_name"] == "Jane Doe"
    assert payload["transit_type"] == "public_transit"
    assert payload["charges"]["drug"] is True



def test_staff_can_list_view_and_update_jobseekers(phase7_env) -> None:
    client, state, session_factory = phase7_env

    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200
    client.patch(
        "/api/v1/jobseekers/me",
        json={
            "full_name": "Jane Doe",
            "phone": "3145550101",
            "address": "123 Main St",
            "city": "St. Louis",
            "zip": "63103",
            "transit_type": "public_transit",
            "charges": {"drug": True, "violent": False},
        },
    )
    seeded_jobseeker = seed_application_for_jobseeker(
        session_factory,
        jobseeker_auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
    )

    staff = seed_staff(session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    listing = client.get("/api/v1/admin/jobseekers", params={"search": "Jane", "charge_drug": "true"})
    assert listing.status_code == 200
    assert listing.json()["meta"]["total_items"] == 1
    assert listing.json()["items"][0]["full_name"] == "Jane Doe"

    detail = client.get(f"/api/v1/admin/jobseekers/{seeded_jobseeker.id}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["jobseeker"]["charges"]["drug"] is True
    assert len(detail_payload["applications"]) == 1
    assert detail_payload["applications"][0]["status"] == "submitted"

    patch = client.patch(
        f"/api/v1/admin/jobseekers/{seeded_jobseeker.id}",
        json={
            "transit_type": "both",
            "status": "hired",
            "charges": {"drug": True, "violent": True},
        },
    )
    assert patch.status_code == 200
    assert patch.json()["jobseeker"]["profile_complete"] is True

    updated = client.get(f"/api/v1/admin/jobseekers/{seeded_jobseeker.id}")
    assert updated.status_code == 200
    updated_payload = updated.json()["jobseeker"]
    assert updated_payload["transit_type"] == "both"
    assert updated_payload["status"] == "hired"
    assert updated_payload["charges"]["violent"] is True

    with session_factory() as session:
        stored = session.execute(select(Jobseeker).where(Jobseeker.id == seeded_jobseeker.id)).scalar_one()
    assert stored.status == JobseekerStatus.HIRED
