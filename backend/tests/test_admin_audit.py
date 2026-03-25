from __future__ import annotations

import tempfile
import uuid
from collections.abc import Generator
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import Application, AppUser, AuditLog, Employer, JobListing, Jobseeker
from app.models.enums import (
    ApplicationStatus,
    AppRole,
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    TransitRequirement,
    TransitType,
)
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'admin-audit.db'}"


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
def admin_audit_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    state = {
        "identity": AuthProviderIdentity(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="staff@example.com",
            auth_provider_role="admin",
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


def seed_admin_audit_data(session_factory):
    with session_factory() as session:
        staff = AppUser(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="staff@example.com",
            auth_provider_role="admin",
            app_role=AppRole.STAFF,
            is_active=True,
        )
        session.add(staff)
        session.flush()

        pending_employer_user = AppUser(
            auth_user_id=uuid.uuid4(),
            email="pending-employer@example.com",
            auth_provider_role="user",
            app_role=AppRole.EMPLOYER,
            is_active=True,
        )
        approved_employer_user = AppUser(
            auth_user_id=uuid.uuid4(),
            email="approved-employer@example.com",
            auth_provider_role="user",
            app_role=AppRole.EMPLOYER,
            is_active=True,
        )
        session.add_all([pending_employer_user, approved_employer_user])
        session.flush()

        pending_employer = Employer(
            app_user_id=pending_employer_user.id,
            org_name="Pending Org",
            review_status=EmployerReviewStatus.PENDING,
        )
        approved_employer = Employer(
            app_user_id=approved_employer_user.id,
            org_name="Approved Org",
            review_status=EmployerReviewStatus.APPROVED,
        )
        session.add_all([pending_employer, approved_employer])
        session.flush()

        active_jobseeker_user = AppUser(
            auth_user_id=uuid.uuid4(),
            email="active-jobseeker@example.com",
            auth_provider_role="user",
            app_role=AppRole.JOBSEEKER,
            is_active=True,
        )
        hired_jobseeker_user = AppUser(
            auth_user_id=uuid.uuid4(),
            email="hired-jobseeker@example.com",
            auth_provider_role="user",
            app_role=AppRole.JOBSEEKER,
            is_active=True,
        )
        session.add_all([active_jobseeker_user, hired_jobseeker_user])
        session.flush()

        active_jobseeker = Jobseeker(
            app_user_id=active_jobseeker_user.id,
            full_name="Active User",
            phone="3145550101",
            address="123 Main St",
            city="St. Louis",
            zip="63103",
            transit_type=TransitType.PUBLIC_TRANSIT,
            status=JobseekerStatus.ACTIVE,
        )
        hired_jobseeker = Jobseeker(
            app_user_id=hired_jobseeker_user.id,
            full_name="Hired User",
            phone="3145550102",
            address="456 Main St",
            city="St. Louis",
            zip="63103",
            transit_type=TransitType.BOTH,
            status=JobseekerStatus.HIRED,
        )
        session.add_all([active_jobseeker, hired_jobseeker])
        session.flush()

        pending_listing = JobListing(
            employer_id=approved_employer.id,
            title="Pending Listing",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.PENDING,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        open_listing = JobListing(
            employer_id=approved_employer.id,
            title="Open Listing",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        closed_listing = JobListing(
            employer_id=approved_employer.id,
            title="Closed Listing",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.CLOSED,
        )
        session.add_all([pending_listing, open_listing, closed_listing])
        session.flush()

        submitted_application = Application(
            jobseeker_id=active_jobseeker.id,
            job_listing_id=open_listing.id,
            status=ApplicationStatus.SUBMITTED,
        )
        reviewed_application = Application(
            jobseeker_id=active_jobseeker.id,
            job_listing_id=closed_listing.id,
            status=ApplicationStatus.REVIEWED,
        )
        hired_application = Application(
            jobseeker_id=hired_jobseeker.id,
            job_listing_id=open_listing.id,
            status=ApplicationStatus.HIRED,
        )
        session.add_all(
            [submitted_application, reviewed_application, hired_application]
        )
        session.flush()

        audit_entries = [
            AuditLog(
                actor_id=staff.id,
                action="employer.approved",
                entity_type="employer",
                entity_id=approved_employer.id,
                old_value={"review_status": "pending"},
                new_value={"review_status": "approved"},
                timestamp=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
            ),
            AuditLog(
                actor_id=staff.id,
                action="application.hired",
                entity_type="application",
                entity_id=hired_application.id,
                old_value={"status": "reviewed"},
                new_value={"status": "hired"},
                timestamp=datetime(2026, 3, 2, 12, 0, tzinfo=timezone.utc),
            ),
            AuditLog(
                actor_id=None,
                action="gtfs_feed_refreshed",
                entity_type="system",
                entity_id=None,
                old_value=None,
                new_value={"listings_recomputed": 3},
                timestamp=datetime(2026, 3, 3, 12, 0, tzinfo=timezone.utc),
            ),
        ]
        session.add_all(audit_entries)
        session.commit()

        return {
            "staff_id": staff.id,
            "approved_employer_id": approved_employer.id,
            "hired_application_id": hired_application.id,
        }


def test_admin_dashboard_returns_expected_summary(admin_audit_env) -> None:
    client, _, session_factory = admin_audit_env
    seed_admin_audit_data(session_factory)

    response = client.get("/api/v1/admin/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "pending_employers": 1,
        "pending_listings": 1,
        "active_jobseekers": 1,
        "open_applications": 2,
        "open_listings": 1,
    }


def test_admin_audit_log_supports_filters_and_system_events(admin_audit_env) -> None:
    client, _, session_factory = admin_audit_env
    seeded = seed_admin_audit_data(session_factory)

    unfiltered = client.get("/api/v1/admin/audit-log")
    assert unfiltered.status_code == 200
    unfiltered_payload = unfiltered.json()
    assert unfiltered_payload["meta"]["total_items"] == 3
    assert [item["action"] for item in unfiltered_payload["items"]] == [
        "gtfs_feed_refreshed",
        "application.hired",
        "employer.approved",
    ]
    assert unfiltered_payload["items"][0]["actor_id"] is None

    by_actor = client.get(
        "/api/v1/admin/audit-log", params={"actor_id": str(seeded["staff_id"])}
    )
    assert by_actor.status_code == 200
    assert by_actor.json()["meta"]["total_items"] == 2
    assert {item["action"] for item in by_actor.json()["items"]} == {
        "employer.approved",
        "application.hired",
    }

    by_entity = client.get(
        "/api/v1/admin/audit-log",
        params={
            "entity_type": "application",
            "entity_id": str(seeded["hired_application_id"]),
            "action": "application.hired",
        },
    )
    assert by_entity.status_code == 200
    assert by_entity.json()["meta"]["total_items"] == 1
    assert by_entity.json()["items"][0]["entity_type"] == "application"
    assert by_entity.json()["items"][0]["entity_id"] == str(
        seeded["hired_application_id"]
    )

    by_date = client.get(
        "/api/v1/admin/audit-log",
        params={"date_from": "2026-03-02T00:00:00Z", "date_to": "2026-03-03T23:59:59Z"},
    )
    assert by_date.status_code == 200
    assert by_date.json()["meta"]["total_items"] == 2
    assert [item["action"] for item in by_date.json()["items"]] == [
        "gtfs_feed_refreshed",
        "application.hired",
    ]


def test_admin_listing_filters_support_city_search_and_employer(
    admin_audit_env,
) -> None:
    client, _, session_factory = admin_audit_env
    seeded = seed_admin_audit_data(session_factory)

    by_employer = client.get(
        "/api/v1/admin/listings",
        params={"employer_id": str(seeded["approved_employer_id"])},
    )
    assert by_employer.status_code == 200
    assert by_employer.json()["meta"]["total_items"] == 3

    by_city = client.get("/api/v1/admin/listings", params={"city": "St. Louis"})
    assert by_city.status_code == 200
    assert by_city.json()["meta"]["total_items"] == 3

    by_search = client.get("/api/v1/admin/listings", params={"search": "Open"})
    assert by_search.status_code == 200
    assert by_search.json()["meta"]["total_items"] == 1
    assert by_search.json()["items"][0]["title"] == "Open Listing"
