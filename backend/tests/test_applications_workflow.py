from __future__ import annotations

import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import Application, AppUser, Employer, JobListing
from app.models.enums import (
    ApplicationStatus,
    AppRole,
    EmployerReviewStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    TransitRequirement,
)
from app.services import applications as applications_service
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'applications-workflow.db'}"


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
def applications_env(monkeypatch: pytest.MonkeyPatch, session_factory):
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

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, state, session_factory

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def bootstrap_completed_jobseeker(client: TestClient) -> None:
    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200
    patch = client.patch(
        "/api/v1/jobseekers/me",
        json={
            "full_name": "Jane Doe",
            "phone": "3145550101",
            "address": "123 Main St",
            "city": "St. Louis",
            "zip": "63103",
            "transit_type": "public_transit",
            "charges": {"theft": True},
        },
    )
    assert patch.status_code == 200


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


def seed_employer_and_listings(
    session_factory,
    *,
    employer_review_status: EmployerReviewStatus = EmployerReviewStatus.APPROVED,
    include_missing_distance_listing: bool = False,
    include_unknown_transit_listing: bool = False,
) -> dict[str, uuid.UUID]:
    with session_factory() as session:
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
            review_status=employer_review_status,
        )
        session.add(employer)
        session.flush()

        eligible_listing = JobListing(
            employer_id=employer.id,
            title="Warehouse Associate",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        disqualified_listing = JobListing(
            employer_id=employer.id,
            title="Cash Office Clerk",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            disq_theft=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        second_eligible_listing = JobListing(
            employer_id=employer.id,
            title="Packaging Associate",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        closed_listing = JobListing(
            employer_id=employer.id,
            title="Closed Listing",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.CLOSED,
        )
        pending_listing = JobListing(
            employer_id=employer.id,
            title="Pending Listing",
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.PENDING,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        )
        session.add_all(
            [
                eligible_listing,
                disqualified_listing,
                second_eligible_listing,
                closed_listing,
                pending_listing,
            ]
        )

        missing_distance_listing = None
        if include_missing_distance_listing:
            missing_distance_listing = JobListing(
                employer_id=employer.id,
                title="Distance Unavailable Listing",
                city="St. Louis",
                zip="63103",
                transit_required=TransitRequirement.ANY,
                transit_accessible=None,
                job_lat=None,
                job_lon=None,
                review_status=ListingReviewStatus.APPROVED,
                lifecycle_status=ListingLifecycleStatus.OPEN,
            )
            session.add(missing_distance_listing)
        unknown_transit_listing = None
        if include_unknown_transit_listing:
            unknown_transit_listing = JobListing(
                employer_id=employer.id,
                title="Transit Info Pending Listing",
                city="St. Louis",
                zip="63103",
                transit_required=TransitRequirement.ANY,
                transit_accessible=None,
                job_lat=38.7000,
                job_lon=-90.2800,
                review_status=ListingReviewStatus.APPROVED,
                lifecycle_status=ListingLifecycleStatus.OPEN,
            )
            session.add(unknown_transit_listing)
        session.commit()
        listing_ids = {
            "eligible": eligible_listing.id,
            "disqualified": disqualified_listing.id,
            "second_eligible": second_eligible_listing.id,
            "closed": closed_listing.id,
            "pending": pending_listing.id,
        }
        if missing_distance_listing is not None:
            listing_ids["missing_distance"] = missing_distance_listing.id
        if unknown_transit_listing is not None:
            listing_ids["unknown_transit"] = unknown_transit_listing.id
        return listing_ids


def test_jobseeker_can_browse_jobs_and_apply(applications_env) -> None:
    client, state, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(session_factory)

    jobs = client.get("/api/v1/jobs", params={"sort": "title"})
    assert jobs.status_code == 200
    payload = jobs.json()
    assert payload["meta"]["total_items"] == 3
    titles = [item["job"]["title"] for item in payload["items"]]
    assert titles == ["Cash Office Clerk", "Packaging Associate", "Warehouse Associate"]
    assert "ineligibility_reasons" not in payload["items"][0]
    assert payload["items"][0]["is_eligible"] is False
    assert payload["items"][0]["ineligibility_tag"] is None
    assert payload["items"][0]["distance_miles"] == pytest.approx(1.0126504778)
    assert payload["items"][0]["has_applied"] is False

    eligible_listing = next(
        item
        for item in payload["items"]
        if item["job"]["title"] == "Warehouse Associate"
    )
    assert eligible_listing["distance_miles"] == pytest.approx(1.0126504778)

    detail = client.get(f"/api/v1/jobs/{listing_ids['eligible']}")
    assert detail.status_code == 200
    assert detail.json()["eligibility"]["is_eligible"] is True
    assert detail.json()["eligibility"]["distance_miles"] == pytest.approx(1.0126504778)
    assert detail.json()["eligibility"]["has_applied"] is False

    closed_detail = client.get(f"/api/v1/jobs/{listing_ids['closed']}")
    assert closed_detail.status_code == 404

    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 200
    application_id = create.json()["application"]["id"]
    assert create.json()["application"]["status"] == "submitted"

    duplicate = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CONFLICT"

    ineligible = client.post(
        "/api/v1/applications",
        json={"job_listing_id": str(listing_ids["disqualified"])},
    )
    assert ineligible.status_code == 422
    assert ineligible.json()["error"]["code"] == "LISTING_NOT_ELIGIBLE"

    mine = client.get("/api/v1/applications/me")
    assert mine.status_code == 200
    assert mine.json()["meta"]["total_items"] == 1
    assert mine.json()["items"][0]["id"] == application_id
    assert mine.json()["items"][0]["job"]["title"] == "Warehouse Associate"

    refreshed_jobs = client.get("/api/v1/jobs", params={"sort": "title"})
    assert refreshed_jobs.status_code == 200
    refreshed_items = refreshed_jobs.json()["items"]
    applied_listing = next(
        item
        for item in refreshed_items
        if item["job"]["title"] == "Warehouse Associate"
    )
    assert applied_listing["has_applied"] is True

    refreshed_detail = client.get(f"/api/v1/jobs/{listing_ids['eligible']}")
    assert refreshed_detail.status_code == 200
    assert refreshed_detail.json()["eligibility"]["has_applied"] is True


def test_rejected_employer_listings_are_hidden_from_jobseekers(
    applications_env,
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(
        session_factory,
        employer_review_status=EmployerReviewStatus.REJECTED,
    )

    jobs = client.get("/api/v1/jobs")
    assert jobs.status_code == 200
    assert jobs.json()["meta"]["total_items"] == 0

    detail = client.get(f"/api/v1/jobs/{listing_ids['eligible']}")
    assert detail.status_code == 404
    assert detail.json()["error"]["code"] == "NOT_FOUND"

    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 404
    assert create.json()["error"]["code"] == "NOT_FOUND"


def test_pending_employer_listings_remain_visible_to_jobseekers(
    applications_env,
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(
        session_factory,
        employer_review_status=EmployerReviewStatus.PENDING,
    )

    jobs = client.get("/api/v1/jobs", params={"sort": "title"})
    assert jobs.status_code == 200
    assert jobs.json()["meta"]["total_items"] == 3
    assert [item["job"]["title"] for item in jobs.json()["items"]] == [
        "Cash Office Clerk",
        "Packaging Associate",
        "Warehouse Associate",
    ]

    detail = client.get(f"/api/v1/jobs/{listing_ids['eligible']}")
    assert detail.status_code == 200
    assert detail.json()["job"]["review_status"] == "approved"
    assert detail.json()["job"]["lifecycle_status"] == "open"

    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 200
    assert create.json()["application"]["status"] == "submitted"


def test_jobseeker_can_still_apply_when_distance_is_unavailable(
    applications_env,
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(
        session_factory, include_missing_distance_listing=True
    )

    jobs = client.get("/api/v1/jobs", params={"sort": "title"})
    assert jobs.status_code == 200
    missing_distance = next(
        item
        for item in jobs.json()["items"]
        if item["job"]["title"] == "Distance Unavailable Listing"
    )
    assert missing_distance["is_eligible"] is True
    assert missing_distance["distance_miles"] is None
    assert (
        missing_distance["eligibility_note"]
        == "Unable to provide distance for this listing right now."
    )

    eligible_only = client.get(
        "/api/v1/jobs", params={"is_eligible": True, "sort": "title"}
    )
    assert eligible_only.status_code == 200
    assert [item["job"]["title"] for item in eligible_only.json()["items"]] == [
        "Distance Unavailable Listing",
        "Packaging Associate",
        "Warehouse Associate",
    ]

    detail = client.get(f"/api/v1/jobs/{listing_ids['missing_distance']}")
    assert detail.status_code == 200
    assert detail.json()["eligibility"]["is_eligible"] is True
    assert detail.json()["eligibility"]["distance_miles"] is None
    assert (
        detail.json()["eligibility"]["eligibility_note"]
        == "Unable to provide distance for this listing right now."
    )

    create = client.post(
        "/api/v1/applications",
        json={"job_listing_id": str(listing_ids["missing_distance"])},
    )
    assert create.status_code == 200
    assert create.json()["application"]["status"] == "submitted"


def test_jobseeker_does_not_get_distance_warning_when_miles_are_available(
    applications_env,
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(
        session_factory, include_unknown_transit_listing=True
    )

    jobs = client.get("/api/v1/jobs", params={"sort": "title"})
    assert jobs.status_code == 200
    unknown_transit = next(
        item
        for item in jobs.json()["items"]
        if item["job"]["title"] == "Transit Info Pending Listing"
    )
    assert unknown_transit["is_eligible"] is True
    assert unknown_transit["distance_miles"] == pytest.approx(5.7510509461)
    assert unknown_transit["eligibility_note"] is None

    detail = client.get(f"/api/v1/jobs/{listing_ids['unknown_transit']}")
    assert detail.status_code == 200
    assert detail.json()["eligibility"]["is_eligible"] is True
    assert detail.json()["eligibility"]["distance_miles"] == pytest.approx(5.7510509461)
    assert detail.json()["eligibility"]["eligibility_note"] is None


def test_incomplete_jobseeker_is_blocked_from_jobs_and_applications(
    applications_env,
) -> None:
    client, _, session_factory = applications_env
    bootstrap = client.post("/api/v1/auth/bootstrap", json={"role": "jobseeker"})
    assert bootstrap.status_code == 200
    listing_ids = seed_employer_and_listings(session_factory)

    jobs = client.get("/api/v1/jobs")
    assert jobs.status_code == 403
    assert jobs.json()["error"]["code"] == "PROFILE_INCOMPLETE"

    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 403
    assert create.json()["error"]["code"] == "PROFILE_INCOMPLETE"


def test_job_list_supports_documented_filters(applications_env) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    seed_employer_and_listings(session_factory)

    by_search = client.get("/api/v1/jobs", params={"search": "Packaging"})
    assert by_search.status_code == 200
    assert by_search.json()["meta"]["total_items"] == 1
    assert by_search.json()["items"][0]["job"]["title"] == "Packaging Associate"

    by_city = client.get("/api/v1/jobs", params={"city": "St. Louis"})
    assert by_city.status_code == 200
    assert by_city.json()["meta"]["total_items"] == 3

    by_transit = client.get("/api/v1/jobs", params={"transit_required": "any"})
    assert by_transit.status_code == 200
    assert by_transit.json()["meta"]["total_items"] == 3

    eligible_only = client.get(
        "/api/v1/jobs", params={"is_eligible": True, "sort": "title"}
    )
    assert eligible_only.status_code == 200
    assert eligible_only.json()["meta"]["total_items"] == 2
    assert [item["job"]["title"] for item in eligible_only.json()["items"]] == [
        "Packaging Associate",
        "Warehouse Associate",
    ]

    ineligible_only = client.get(
        "/api/v1/jobs", params={"is_eligible": False, "sort": "title"}
    )
    assert ineligible_only.status_code == 200
    assert ineligible_only.json()["meta"]["total_items"] == 1
    assert ineligible_only.json()["items"][0]["job"]["title"] == "Cash Office Clerk"


def test_job_list_paginates_before_evaluating_page_items(
    applications_env, monkeypatch: pytest.MonkeyPatch
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    seed_employer_and_listings(session_factory)

    original = applications_service.evaluate_jobseeker_listing_match
    calls = {"count": 0}

    def counting_match(*args, **kwargs):
        calls["count"] += 1
        return original(*args, **kwargs)

    monkeypatch.setattr(
        applications_service, "evaluate_jobseeker_listing_match", counting_match
    )

    jobs = client.get("/api/v1/jobs", params={"page_size": 1, "sort": "title"})
    assert jobs.status_code == 200
    assert jobs.json()["meta"]["total_items"] == 3
    assert len(jobs.json()["items"]) == 1
    assert jobs.json()["items"][0]["job"]["title"] == "Cash Office Clerk"
    assert calls["count"] == 1


def test_job_list_applies_eligibility_filter_before_page_serialization(
    applications_env, monkeypatch: pytest.MonkeyPatch
) -> None:
    client, _, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    seed_employer_and_listings(session_factory)

    original = applications_service.evaluate_jobseeker_listing_match
    calls = {"count": 0}

    def counting_match(*args, **kwargs):
        calls["count"] += 1
        return original(*args, **kwargs)

    monkeypatch.setattr(
        applications_service, "evaluate_jobseeker_listing_match", counting_match
    )

    jobs = client.get(
        "/api/v1/jobs",
        params={"page_size": 1, "sort": "title", "is_eligible": True},
    )
    assert jobs.status_code == 200
    assert jobs.json()["meta"]["total_items"] == 2
    assert len(jobs.json()["items"]) == 1
    assert jobs.json()["items"][0]["job"]["title"] == "Packaging Associate"
    assert jobs.json()["items"][0]["is_eligible"] is True
    assert calls["count"] == 1


def test_admin_can_review_hire_and_close_listing_from_application(
    applications_env,
) -> None:
    client, state, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(session_factory)

    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 200
    application_id = create.json()["application"]["id"]

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    listing = client.get("/api/v1/admin/applications", params={"status": "submitted"})
    assert listing.status_code == 200
    assert listing.json()["meta"]["total_items"] == 1
    assert listing.json()["items"][0]["job"]["title"] == "Warehouse Associate"
    assert listing.json()["items"][0]["jobseeker"]["full_name"] == "Jane Doe"

    reviewed = client.patch(
        f"/api/v1/admin/applications/{application_id}",
        json={"status": "reviewed"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["application"]["status"] == "reviewed"
    assert reviewed.json()["application"]["updated_at"] is not None

    hired = client.patch(
        f"/api/v1/admin/applications/{application_id}",
        json={"status": "hired", "close_listing_after_hire": True},
    )
    assert hired.status_code == 200
    assert hired.json()["application"]["status"] == "hired"

    invalid = client.patch(
        f"/api/v1/admin/applications/{application_id}",
        json={"status": "submitted"},
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "INVALID_APPLICATION_STATUS_TRANSITION"

    with session_factory() as session:
        stored_application = session.get(Application, uuid.UUID(application_id))
        stored_listing = session.get(JobListing, listing_ids["eligible"])
        assert stored_application is not None
        assert stored_application.status == ApplicationStatus.HIRED
        assert stored_listing is not None
        assert stored_listing.lifecycle_status == ListingLifecycleStatus.CLOSED


def test_admin_application_list_supports_employer_filter(applications_env) -> None:
    client, state, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(session_factory)
    create = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert create.status_code == 200

    with session_factory() as session:
        listing = session.get(JobListing, listing_ids["eligible"])
        assert listing is not None
        employer = session.get(Employer, listing.employer_id)
        assert employer is not None
        employer_id = employer.id

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    filtered = client.get(
        "/api/v1/admin/applications", params={"employer_id": str(employer_id)}
    )
    assert filtered.status_code == 200
    assert filtered.json()["meta"]["total_items"] == 1
    assert filtered.json()["items"][0]["job"]["title"] == "Warehouse Associate"


def test_hired_application_does_not_block_additional_applications(
    applications_env,
) -> None:
    client, state, session_factory = applications_env
    bootstrap_completed_jobseeker(client)
    listing_ids = seed_employer_and_listings(session_factory)

    first_application = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing_ids["eligible"])}
    )
    assert first_application.status_code == 200
    application_id = first_application.json()["application"]["id"]

    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    state["identity"] = AuthProviderIdentity(
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    hired = client.patch(
        f"/api/v1/admin/applications/{application_id}",
        json={"status": "hired"},
    )
    assert hired.status_code == 200

    state["identity"] = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="jobseeker@example.com",
        auth_provider_role="user",
    )
    second_application = client.post(
        "/api/v1/applications",
        json={"job_listing_id": str(listing_ids["second_eligible"])},
    )
    assert second_application.status_code == 200
    assert second_application.json()["application"]["status"] == "submitted"

    mine = client.get(
        "/api/v1/applications/me", params={"sort": "applied_at", "order": "desc"}
    )
    assert mine.status_code == 200
    assert mine.json()["meta"]["total_items"] == 2
    assert {item["job"]["title"] for item in mine.json()["items"]} == {
        "Warehouse Associate",
        "Packaging Associate",
    }
