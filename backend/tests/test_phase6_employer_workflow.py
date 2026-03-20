from __future__ import annotations

import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import AppUser, AuditLog, Employer, JobListing
from app.models.enums import (
    AppRole,
    EmployerReviewStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
)
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity
from app.services.geocoding import GeocodeResult
from app.services.transit import TransitComputationResult


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'phase6.db'}"


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
def phase6_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    state = {
        "identity": AuthProviderIdentity(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="employer@example.com",
            auth_provider_role="user",
        )
    }

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return state["identity"]

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, state, session_factory

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def seed_staff(session_factory, *, auth_user_id: uuid.UUID | None = None) -> AppUser:
    auth_user_id = auth_user_id or uuid.uuid4()
    with session_factory() as session:
        staff = session.execute(
            select(AppUser).where(AppUser.auth_user_id == auth_user_id)
        ).scalar_one_or_none()
        if staff is None:
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


def test_employer_review_and_listing_workflow(phase6_env) -> None:
    client, state, session_factory = phase6_env

    bootstrap = client.post(
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
    assert bootstrap.status_code == 200

    me = client.get("/api/v1/employers/me")
    assert me.status_code == 200
    assert me.json()["employer"]["review_status"] == "pending"

    patch_me = client.patch(
        "/api/v1/employers/me",
        json={"address": "500 Market St", "city": "St. Louis", "zip": "63101"},
    )
    assert patch_me.status_code == 200
    assert patch_me.json()["employer"]["address"] == "500 Market St"

    blocked_listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Warehouse Associate", "transit_required": "any"},
    )
    assert blocked_listing.status_code == 403
    assert blocked_listing.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    staff = seed_staff(session_factory)
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_queue = client.get("/api/v1/admin/queue/employers")
    assert employer_queue.status_code == 200
    assert employer_queue.json()["meta"]["total_items"] == 1
    employer_id = employer_queue.json()["items"][0]["id"]

    approve_employer = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={
            "review_status": "approved",
            "review_note": "Approved after manual review.",
        },
    )
    assert approve_employer.status_code == 200
    assert approve_employer.json()["employer"]["review_status"] == "approved"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )

    create_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "description": "Loading and inventory assistance.",
            "location_address": "2000 North Broadway",
            "city": "St. Louis",
            "zip": "63102",
            "transit_required": "any",
            "disqualifying_charges": {"theft": True},
        },
    )
    assert create_listing.status_code == 200
    listing_payload = create_listing.json()["listing"]
    assert listing_payload["review_status"] == "pending"
    assert listing_payload["lifecycle_status"] == "open"
    listing_id = listing_payload["id"]

    my_listings = client.get("/api/v1/employer/listings")
    assert my_listings.status_code == 200
    assert my_listings.json()["meta"]["total_items"] == 1

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    listing_queue = client.get("/api/v1/admin/queue/listings")
    assert listing_queue.status_code == 200
    assert listing_queue.json()["meta"]["total_items"] == 1

    approve_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"review_status": "approved", "review_note": "Transit check passed."},
    )
    assert approve_listing.status_code == 200
    assert approve_listing.json()["listing"]["review_status"] == "approved"

    close_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"lifecycle_status": "closed", "review_note": "Closed after hire."},
    )
    assert close_listing.status_code == 200
    assert close_listing.json()["listing"]["lifecycle_status"] == "closed"

    with session_factory() as session:
        employer = session.execute(select(Employer)).scalar_one()
        listing = session.execute(select(JobListing)).scalar_one()
        audits = (
            session.execute(select(AuditLog).order_by(AuditLog.timestamp))
            .scalars()
            .all()
        )

    assert employer.review_status == EmployerReviewStatus.APPROVED
    assert listing.review_status == ListingReviewStatus.APPROVED
    assert listing.lifecycle_status == ListingLifecycleStatus.CLOSED
    assert len(audits) >= 3


def test_staff_can_reassess_rejected_employer_and_listing(phase6_env) -> None:
    client, state, session_factory = phase6_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "ReEntry Works"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]

    rejected = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "rejected", "review_note": "Needs verification."},
    )
    assert rejected.status_code == 200
    assert rejected.json()["employer"]["review_status"] == "rejected"

    approved = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Verified and approved."},
    )
    assert approved.status_code == 200
    assert approved.json()["employer"]["review_status"] == "approved"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Forklift Operator", "transit_required": "own_car"},
    )
    assert listing.status_code == 200
    listing_id = listing.json()["listing"]["id"]

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    rejected_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={
            "review_status": "rejected",
            "review_note": "Needs transit clarification.",
        },
    )
    assert rejected_listing.status_code == 200
    assert rejected_listing.json()["listing"]["review_status"] == "rejected"

    approved_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"review_status": "approved", "review_note": "Clarification received."},
    )
    assert approved_listing.status_code == 200
    assert approved_listing.json()["listing"]["review_status"] == "approved"


def test_staff_cannot_move_employer_from_approved_back_to_pending(phase6_env) -> None:
    client, state, session_factory = phase6_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]

    approved = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved.status_code == 200

    invalid = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "pending", "review_note": "Invalid rollback."},
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "STATE_TRANSITION_NOT_ALLOWED"


def test_staff_cannot_reopen_closed_listing(phase6_env) -> None:
    client, state, session_factory = phase6_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    approved_employer = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved_employer.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Warehouse Associate", "transit_required": "any"},
    )
    assert listing.status_code == 200
    listing_id = listing.json()["listing"]["id"]

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    approved_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved_listing.status_code == 200

    closed_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"lifecycle_status": "closed", "review_note": "Closed after hire."},
    )
    assert closed_listing.status_code == 200

    invalid_reopen = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"lifecycle_status": "open", "review_note": "Invalid reopen."},
    )
    assert invalid_reopen.status_code == 422
    assert invalid_reopen.json()["error"]["code"] == "STATE_TRANSITION_NOT_ALLOWED"


def test_employer_can_view_listing_applicants_when_sharing_is_enabled(
    phase6_env,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, state, session_factory = phase6_env
    monkeypatch.setattr(
        "app.services.employer.geocode_address",
        lambda **_: GeocodeResult(38.6270, -90.1994, "St. Louis"),
    )
    monkeypatch.setattr(
        "app.services.employer.compute_transit_accessibility",
        lambda **_: TransitComputationResult(
            transit_accessible=True, nearest_stop_distance_miles=0.2, warning=None
        ),
    )

    bootstrap = client.post(
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
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    approved_employer = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved_employer.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "description": "Loading and inventory assistance.",
            "location_address": "2000 North Broadway",
            "city": "St. Louis",
            "zip": "63102",
            "transit_required": "any",
        },
    )
    assert listing.status_code == 200
    listing_id = listing.json()["listing"]["id"]

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    approved_listing = client.patch(
        f"/api/v1/admin/listings/{listing_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved_listing.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        email="jobseeker@example.com",
        auth_provider_role="user",
    )
    bootstrap_jobseeker = client.post(
        "/api/v1/auth/bootstrap", json={"role": "jobseeker"}
    )
    assert bootstrap_jobseeker.status_code == 200
    profile = client.patch(
        "/api/v1/jobseekers/me",
        json={
            "full_name": "Jane Doe",
            "phone": "3145550101",
            "address": "123 Main St",
            "city": "St. Louis",
            "zip": "63103",
            "transit_type": "public_transit",
            "charges": {"drug": True, "theft": True},
        },
    )
    assert profile.status_code == 200

    application = client.post(
        "/api/v1/applications",
        json={"job_listing_id": listing_id},
    )
    assert application.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    blocked = client.get(f"/api/v1/employer/listings/{listing_id}/applicants")
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "APPLICANT_VISIBILITY_DISABLED"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    config = client.patch(
        "/api/v1/admin/config/notifications",
        json={"share_applicants_with_employer": True},
    )
    assert config.status_code == 200
    assert config.json()["config"]["share_applicants_with_employer"] is True

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    applicants = client.get(f"/api/v1/employer/listings/{listing_id}/applicants")
    assert applicants.status_code == 200
    payload = applicants.json()
    assert payload["meta"]["total_items"] == 1
    assert payload["items"][0]["status"] == "submitted"
    assert payload["items"][0]["jobseeker"]["full_name"] == "Jane Doe"
    assert payload["items"][0]["jobseeker"]["charges"]["drug"] is True
    assert payload["items"][0]["jobseeker"]["charges"]["theft"] is True
