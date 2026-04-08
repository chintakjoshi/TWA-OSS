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
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'employer-workflow.db'}"


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
def employer_workflow_env(monkeypatch: pytest.MonkeyPatch, session_factory):
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


def test_employer_review_and_listing_workflow(employer_workflow_env) -> None:
    client, state, session_factory = employer_workflow_env

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
    assert patch_me.status_code == 403
    assert patch_me.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

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

    patch_me = client.patch(
        "/api/v1/employers/me",
        json={"address": "500 Market St", "city": "St. Louis", "zip": "63101"},
    )
    assert patch_me.status_code == 200
    assert patch_me.json()["employer"]["address"] == "500 Market St"
    assert patch_me.json()["employer"]["review_status"] == "pending"
    assert patch_me.json()["employer"]["review_note"] is None

    blocked_listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Warehouse Associate", "transit_required": "any"},
    )
    assert blocked_listing.status_code == 403
    assert blocked_listing.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    employer_queue = client.get("/api/v1/admin/queue/employers")
    assert employer_queue.status_code == 200
    assert employer_queue.json()["meta"]["total_items"] == 1

    reapprove_employer = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={
            "review_status": "approved",
            "review_note": "Approved after profile update review.",
        },
    )
    assert reapprove_employer.status_code == 200
    assert reapprove_employer.json()["employer"]["review_status"] == "approved"

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
    assert len(audits) >= 4


def test_profile_update_requeues_review_but_keeps_existing_listing_active(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

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
        session_factory, auth_user_id=uuid.UUID("f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0")
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
    created_listing = client.post(
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
    assert created_listing.status_code == 200
    listing_id = created_listing.json()["listing"]["id"]

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
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    patch_me = client.patch(
        "/api/v1/employers/me",
        json={"address": "500 Market St", "city": "St. Louis", "zip": "63101"},
    )
    assert patch_me.status_code == 200
    assert patch_me.json()["employer"]["review_status"] == "pending"
    assert patch_me.json()["employer"]["review_note"] is None
    assert patch_me.json()["employer"]["reviewed_by"] is None
    assert patch_me.json()["employer"]["reviewed_at"] is None

    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_queue = client.get("/api/v1/admin/queue/employers")
    assert employer_queue.status_code == 200
    assert employer_queue.json()["meta"]["total_items"] == 1
    queue_item = employer_queue.json()["items"][0]
    assert queue_item["profile_changes"]["changed_at"] is not None
    assert queue_item["profile_changes"]["changes"] == [
        {
            "field": "address",
            "label": "Address",
            "previous_value": None,
            "current_value": "500 Market St",
        },
        {
            "field": "city",
            "label": "City",
            "previous_value": None,
            "current_value": "St. Louis",
        },
        {
            "field": "zip",
            "label": "ZIP code",
            "previous_value": None,
            "current_value": "63101",
        },
    ]

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    my_listings = client.get("/api/v1/employer/listings")
    assert my_listings.status_code == 200
    assert my_listings.json()["meta"]["total_items"] == 1
    assert my_listings.json()["items"][0]["review_status"] == "approved"
    assert my_listings.json()["items"][0]["lifecycle_status"] == "open"

    listing_detail = client.get(f"/api/v1/employer/listings/{listing_id}")
    assert listing_detail.status_code == 200
    assert listing_detail.json()["listing"]["review_status"] == "approved"
    assert listing_detail.json()["listing"]["lifecycle_status"] == "open"

    create_listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Second Listing", "transit_required": "any"},
    )
    assert create_listing.status_code == 403
    assert create_listing.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    with session_factory() as session:
        employer = session.execute(select(Employer)).scalar_one()
        listing = session.execute(select(JobListing)).scalar_one()

    assert employer.review_status == EmployerReviewStatus.PENDING
    assert employer.review_note is None
    assert employer.reviewed_by is None
    assert employer.reviewed_at is None
    assert listing.review_status == ListingReviewStatus.APPROVED
    assert listing.lifecycle_status == ListingLifecycleStatus.OPEN


def test_staff_can_reassess_rejected_employer_and_listing(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

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


def test_rejected_employer_keeps_read_only_access_but_loses_mutations_and_applicants(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

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
        session_factory, auth_user_id=uuid.UUID("12121212-1212-1212-1212-121212121212")
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

    config = client.patch(
        "/api/v1/admin/config/notifications",
        json={"share_applicants_with_employer": True},
    )
    assert config.status_code == 200

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

    rejected_employer = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "rejected", "review_note": "Needs re-review."},
    )
    assert rejected_employer.status_code == 200
    assert rejected_employer.json()["employer"]["review_status"] == "rejected"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )

    me = client.get("/api/v1/employers/me")
    assert me.status_code == 200
    assert me.json()["employer"]["review_status"] == "rejected"

    my_listings = client.get("/api/v1/employer/listings")
    assert my_listings.status_code == 200
    assert my_listings.json()["meta"]["total_items"] == 1

    listing_detail = client.get(f"/api/v1/employer/listings/{listing_id}")
    assert listing_detail.status_code == 200
    assert listing_detail.json()["listing"]["id"] == listing_id

    patch_me = client.patch(
        "/api/v1/employers/me",
        json={"address": "500 Market St"},
    )
    assert patch_me.status_code == 403
    assert patch_me.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    create_listing = client.post(
        "/api/v1/employer/listings",
        json={"title": "Second Listing", "transit_required": "any"},
    )
    assert create_listing.status_code == 403
    assert create_listing.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    applicants = client.get("/api/v1/employer/applicants")
    assert applicants.status_code == 403
    assert applicants.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"

    listing_applicants = client.get(
        f"/api/v1/employer/listings/{listing_id}/applicants"
    )
    assert listing_applicants.status_code == 403
    assert listing_applicants.json()["error"]["code"] == "EMPLOYER_REVIEW_PENDING"


def test_staff_cannot_move_employer_from_approved_back_to_pending(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

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


def test_staff_cannot_reopen_closed_listing(employer_workflow_env) -> None:
    client, state, session_factory = employer_workflow_env

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


def test_employer_profile_update_normalizes_address_fields(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("99999999-9999-9999-9999-999999999999")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    approve = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approve.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    patch_me = client.patch(
        "/api/v1/employers/me",
        json={
            "address": " 500   Market St  ",
            "city": "  St.   Louis ",
            "zip": " 63101 1234 ",
        },
    )
    assert patch_me.status_code == 200
    payload = patch_me.json()["employer"]
    assert payload["address"] == "500 Market St"
    assert payload["city"] == "St. Louis"
    assert payload["zip"] == "63101-1234"


def test_listing_creation_normalizes_address_fields(employer_workflow_env) -> None:
    client, state, session_factory = employer_workflow_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("88888888-8888-8888-8888-888888888888")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    approve = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approve.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    create_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "location_address": " 2000   North Broadway ",
            "city": " St.   Louis ",
            "zip": " 63102 0001 ",
        },
    )
    assert create_listing.status_code == 200
    payload = create_listing.json()["listing"]
    assert payload["location_address"] == "2000 North Broadway"
    assert payload["city"] == "St. Louis"
    assert payload["zip"] == "63102-0001"


def test_listing_creation_rejects_unknown_zip_code(employer_workflow_env) -> None:
    client, state, session_factory = employer_workflow_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("77777777-7777-7777-7777-777777777777")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_id = client.get("/api/v1/admin/queue/employers").json()["items"][0]["id"]
    approve = client.patch(
        f"/api/v1/admin/employers/{employer_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approve.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    create_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Associate",
            "location_address": "2000 North Broadway",
            "city": "St. Louis",
            "zip": "00000",
        },
    )

    assert create_listing.status_code == 422
    assert create_listing.json()["error"]["code"] == "VALIDATION_ERROR"
    assert any(
        detail["loc"][-1] == "zip" and "valid US ZIP code" in detail["msg"]
        for detail in create_listing.json()["error"]["details"]
    )


def test_employer_listing_list_supports_search_and_sort(
    employer_workflow_env,
) -> None:
    client, state, session_factory = employer_workflow_env

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {"org_name": "Northside Logistics"},
        },
    )
    assert bootstrap.status_code == 200

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0")
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

    for title in ("Warehouse Lead", "Delivery Driver", "Forklift Operator"):
        listing = client.post(
            "/api/v1/employer/listings",
            json={"title": title, "transit_required": "any"},
        )
        assert listing.status_code == 200

    searched = client.get("/api/v1/employer/listings", params={"search": "driver"})
    assert searched.status_code == 200
    searched_payload = searched.json()
    assert searched_payload["meta"]["total_items"] == 1
    assert searched_payload["items"][0]["title"] == "Delivery Driver"

    sorted_payload = client.get(
        "/api/v1/employer/listings",
        params={"sort": "title", "order": "asc", "page_size": 20},
    )
    assert sorted_payload.status_code == 200
    assert [item["title"] for item in sorted_payload.json()["items"]] == [
        "Delivery Driver",
        "Forklift Operator",
        "Warehouse Lead",
    ]


def test_employer_can_view_listing_applicants_when_sharing_is_enabled(
    employer_workflow_env,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, state, session_factory = employer_workflow_env
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

    second_listing = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Transit Dispatcher",
            "description": "Coordinate daily routes.",
            "location_address": "3100 Olive St",
            "city": "St. Louis",
            "zip": "63103",
            "transit_required": "any",
        },
    )
    assert second_listing.status_code == 200
    second_listing_id = second_listing.json()["listing"]["id"]

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

    approved_second_listing = client.patch(
        f"/api/v1/admin/listings/{second_listing_id}",
        json={"review_status": "approved", "review_note": "Approved."},
    )
    assert approved_second_listing.status_code == 200

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
    application_id = application.json()["application"]["id"]

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        email="jobseeker-two@example.com",
        auth_provider_role="user",
    )
    bootstrap_jobseeker_two = client.post(
        "/api/v1/auth/bootstrap", json={"role": "jobseeker"}
    )
    assert bootstrap_jobseeker_two.status_code == 200
    second_profile = client.patch(
        "/api/v1/jobseekers/me",
        json={
            "full_name": "Marco Hill",
            "phone": "3145550102",
            "address": "456 Pine St",
            "city": "Columbia",
            "zip": "65201",
            "transit_type": "public_transit",
            "charges": {"drug": True},
        },
    )
    assert second_profile.status_code == 200

    second_application = client.post(
        "/api/v1/applications",
        json={"job_listing_id": second_listing_id},
    )
    assert second_application.status_code == 200

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

    hired = client.patch(
        f"/api/v1/admin/applications/{application_id}",
        json={"status": "hired", "close_listing_after_hire": False},
    )
    assert hired.status_code == 200
    assert hired.json()["application"]["status"] == "hired"

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="employer@example.com",
        auth_provider_role="user",
    )
    applicants = client.get(f"/api/v1/employer/listings/{listing_id}/applicants")
    assert applicants.status_code == 200
    payload = applicants.json()
    assert payload["meta"]["total_items"] == 1
    assert payload["items"][0]["status"] == "hired"
    assert payload["items"][0]["jobseeker"]["full_name"] == "Jane Doe"
    assert payload["items"][0]["jobseeker"]["charges"]["drug"] is True
    assert payload["items"][0]["jobseeker"]["charges"]["theft"] is True

    filtered_applicants = client.get(
        "/api/v1/employer/applicants",
        params={"search": "Jane", "status": "hired"},
    )
    assert filtered_applicants.status_code == 200
    filtered_payload = filtered_applicants.json()
    assert filtered_payload["meta"]["total_items"] == 1
    assert filtered_payload["items"][0]["jobseeker"]["full_name"] == "Jane Doe"
    assert filtered_payload["items"][0]["listing"]["title"] == "Warehouse Associate"

    listing_scoped = client.get(
        "/api/v1/employer/applicants",
        params={"job_listing_id": second_listing_id},
    )
    assert listing_scoped.status_code == 200
    scoped_payload = listing_scoped.json()
    assert scoped_payload["meta"]["total_items"] == 1
    assert scoped_payload["items"][0]["jobseeker"]["full_name"] == "Marco Hill"

    sorted_applicants = client.get(
        "/api/v1/employer/applicants",
        params={"sort": "jobseeker_name", "order": "asc", "page_size": 5},
    )
    assert sorted_applicants.status_code == 200
    assert [
        item["jobseeker"]["full_name"] for item in sorted_applicants.json()["items"]
    ] == ["Jane Doe", "Marco Hill"]

    listing_filtered = client.get(
        f"/api/v1/employer/listings/{listing_id}/applicants",
        params={"search": "Jane", "status": "hired"},
    )
    assert listing_filtered.status_code == 200
    listing_filtered_payload = listing_filtered.json()
    assert listing_filtered_payload["meta"]["total_items"] == 1
    assert listing_filtered_payload["items"][0]["status"] == "hired"
