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
from app.models import AppUser, Employer, JobListing, Jobseeker
from app.models.enums import (
    AppRole,
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    TransitRequirement,
    TransitType,
)
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity
from app.services.matching import (
    get_eligible_jobs_for_jobseeker,
    get_eligible_jobseekers_for_job,
)


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'phase9.db'}"


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
def phase9_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    staff_identity = AuthProviderIdentity(
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="staff@example.com",
        auth_provider_role="admin",
    )

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return staff_identity

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, session_factory, staff_identity

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def seed_staff(session: Session, identity: AuthProviderIdentity) -> AppUser:
    staff = AppUser(
        auth_user_id=identity.auth_user_id,
        email=identity.email,
        auth_provider_role=identity.auth_provider_role,
        app_role=AppRole.STAFF,
        is_active=True,
    )
    session.add(staff)
    session.flush()
    return staff


def seed_employer_and_listing_set(session: Session) -> tuple[Jobseeker, JobListing]:
    jobseeker_user = AppUser(
        auth_user_id=uuid.uuid4(),
        email="jobseeker@example.com",
        auth_provider_role="user",
        app_role=AppRole.JOBSEEKER,
        is_active=True,
    )
    session.add(jobseeker_user)
    session.flush()
    jobseeker = Jobseeker(
        app_user_id=jobseeker_user.id,
        full_name="Transit User",
        phone="3145550101",
        address="123 Main St",
        city="St. Louis",
        zip="63103",
        transit_type=TransitType.PUBLIC_TRANSIT,
        charge_theft=True,
        status=JobseekerStatus.ACTIVE,
    )
    session.add(jobseeker)

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

    listings = [
        JobListing(
            employer_id=employer.id,
            title="Eligible Listing",
            city="St. Louis",
            zip="63102",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        ),
        JobListing(
            employer_id=employer.id,
            title="Charge Mismatch Listing",
            city="St. Louis",
            zip="63102",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            disq_theft=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        ),
        JobListing(
            employer_id=employer.id,
            title="Transit Mismatch Listing",
            city="St. Louis",
            zip="63127",
            transit_required=TransitRequirement.ANY,
            transit_accessible=False,
            job_lat=38.5270,
            job_lon=-90.4000,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        ),
        JobListing(
            employer_id=employer.id,
            title="Both Mismatch Listing",
            city="St. Louis",
            zip="63127",
            transit_required=TransitRequirement.ANY,
            transit_accessible=False,
            job_lat=38.5270,
            job_lon=-90.4000,
            disq_theft=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        ),
        JobListing(
            employer_id=employer.id,
            title="Missing Transit Data Listing",
            city="St. Louis",
            zip="63127",
            transit_required=TransitRequirement.ANY,
            transit_accessible=None,
            job_lat=38.5270,
            job_lon=-90.4000,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.OPEN,
        ),
        JobListing(
            employer_id=employer.id,
            title="Closed Listing",
            city="St. Louis",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            review_status=ListingReviewStatus.APPROVED,
            lifecycle_status=ListingLifecycleStatus.CLOSED,
        ),
    ]
    session.add_all(listings)
    session.flush()
    return jobseeker, listings[3]


def seed_jobseekers_for_listing(
    session: Session, listing: JobListing
) -> list[Jobseeker]:
    jobseekers: list[Jobseeker] = []
    configs = [
        ("Eligible Jobseeker", TransitType.BOTH, False, JobseekerStatus.ACTIVE),
        ("Charge Mismatch Jobseeker", TransitType.BOTH, True, JobseekerStatus.ACTIVE),
        (
            "Transit Mismatch Jobseeker",
            TransitType.PUBLIC_TRANSIT,
            False,
            JobseekerStatus.ACTIVE,
        ),
        (
            "Both Mismatch Jobseeker",
            TransitType.PUBLIC_TRANSIT,
            True,
            JobseekerStatus.ACTIVE,
        ),
        ("Incomplete Jobseeker", None, False, JobseekerStatus.ACTIVE),
        ("Hired Jobseeker", TransitType.BOTH, False, JobseekerStatus.HIRED),
    ]
    for full_name, transit_type, charge_theft, status in configs:
        user = AppUser(
            auth_user_id=uuid.uuid4(),
            email=f"{full_name.replace(' ', '').lower()}@example.com",
            auth_provider_role="user",
            app_role=AppRole.JOBSEEKER,
            is_active=True,
        )
        session.add(user)
        session.flush()
        jobseeker = Jobseeker(
            app_user_id=user.id,
            full_name=full_name,
            phone="3145550101" if transit_type is not None else None,
            address="123 Main St" if transit_type is not None else None,
            city="St. Louis",
            zip="63103" if transit_type is not None else None,
            transit_type=transit_type,
            charge_theft=charge_theft,
            status=status,
        )
        session.add(jobseeker)
        jobseekers.append(jobseeker)
    session.flush()
    return jobseekers


def test_get_eligible_jobs_for_jobseeker_returns_expected_reason_sets(
    session_factory,
) -> None:
    with session_factory() as session:
        jobseeker, _ = seed_employer_and_listing_set(session)
        session.commit()
        session.refresh(jobseeker)

        items = get_eligible_jobs_for_jobseeker(session, jobseeker.id)

    by_title = {item.job.title: item for item in items}
    assert set(by_title) == {
        "Eligible Listing",
        "Charge Mismatch Listing",
        "Transit Mismatch Listing",
        "Both Mismatch Listing",
        "Missing Transit Data Listing",
    }
    assert by_title["Eligible Listing"].is_eligible is True
    assert by_title["Eligible Listing"].ineligibility_reasons == []

    assert by_title["Charge Mismatch Listing"].is_eligible is False
    assert by_title["Charge Mismatch Listing"].ineligibility_reasons == [
        "charge_theft_disqualified"
    ]
    assert by_title["Charge Mismatch Listing"].ineligibility_tag is None

    assert by_title["Transit Mismatch Listing"].is_eligible is False
    assert by_title["Transit Mismatch Listing"].ineligibility_reasons == [
        "transit_unreachable"
    ]
    assert by_title["Transit Mismatch Listing"].ineligibility_tag is not None

    assert by_title["Both Mismatch Listing"].is_eligible is False
    assert set(by_title["Both Mismatch Listing"].ineligibility_reasons) == {
        "charge_theft_disqualified",
        "transit_unreachable",
    }

    assert by_title["Missing Transit Data Listing"].is_eligible is False
    assert by_title["Missing Transit Data Listing"].ineligibility_reasons == [
        "transit_data_unavailable"
    ]


def test_get_eligible_jobseekers_for_job_returns_expected_reason_sets(
    session_factory,
) -> None:
    with session_factory() as session:
        _, listing = seed_employer_and_listing_set(session)
        seed_jobseekers_for_listing(session, listing)
        session.commit()
        session.refresh(listing)

        items = get_eligible_jobseekers_for_job(session, listing.id)

    by_name = {item.jobseeker.full_name: item for item in items}
    assert set(by_name) == {
        "Eligible Jobseeker",
        "Charge Mismatch Jobseeker",
        "Transit Mismatch Jobseeker",
        "Both Mismatch Jobseeker",
        "Incomplete Jobseeker",
        "Transit User",
    }
    assert by_name["Eligible Jobseeker"].is_eligible is True
    assert by_name["Eligible Jobseeker"].ineligibility_reasons == []
    assert by_name["Charge Mismatch Jobseeker"].ineligibility_reasons == [
        "charge_theft_disqualified"
    ]
    assert by_name["Transit Mismatch Jobseeker"].ineligibility_reasons == [
        "transit_unreachable"
    ]
    assert set(by_name["Both Mismatch Jobseeker"].ineligibility_reasons) == {
        "charge_theft_disqualified",
        "transit_unreachable",
    }
    assert by_name["Incomplete Jobseeker"].ineligibility_reasons == [
        "profile_incomplete"
    ]


def test_admin_matching_endpoints_return_expected_payloads(phase9_env) -> None:
    client, session_factory, staff_identity = phase9_env
    with session_factory() as session:
        seed_staff(session, staff_identity)
        jobseeker, listing = seed_employer_and_listing_set(session)
        seed_jobseekers_for_listing(session, listing)
        session.commit()
        session.refresh(jobseeker)
        session.refresh(listing)
        jobseeker_id = jobseeker.id
        listing_id = listing.id

    jobseeker_match = client.get(f"/api/v1/admin/match/jobseeker/{jobseeker_id}")
    assert jobseeker_match.status_code == 200
    job_items = {item["job"]["title"]: item for item in jobseeker_match.json()["items"]}
    assert job_items["Eligible Listing"]["is_eligible"] is True
    assert job_items["Both Mismatch Listing"]["is_eligible"] is False
    assert set(job_items["Both Mismatch Listing"]["ineligibility_reasons"]) == {
        "charge_theft_disqualified",
        "transit_unreachable",
    }

    listing_match = client.get(f"/api/v1/admin/match/listing/{listing_id}")
    assert listing_match.status_code == 200
    seeker_items = {
        item["jobseeker"]["full_name"]: item for item in listing_match.json()["items"]
    }
    assert seeker_items["Eligible Jobseeker"]["is_eligible"] is True
    assert seeker_items["Transit Mismatch Jobseeker"]["ineligibility_reasons"] == [
        "transit_unreachable"
    ]
    assert seeker_items["Incomplete Jobseeker"]["ineligibility_reasons"] == [
        "profile_incomplete"
    ]
