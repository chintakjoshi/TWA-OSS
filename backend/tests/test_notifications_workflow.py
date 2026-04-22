from __future__ import annotations

import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.auth import AuthContext
from app.core.config import get_settings
from app.db.session import get_db_session
from app.main import create_app
from app.models import (
    Application,
    AppUser,
    AuditLog,
    Employer,
    JobListing,
    Jobseeker,
    Notification,
    NotificationConfig,
)
from app.models.enums import (
    ApplicationStatus,
    AppRole,
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    NotificationChannel,
    TransitRequirement,
    TransitType,
)
from app.routers.v1.notifications import stream_my_notifications
from app.services import notifications as notifications_service
from app.services.auth import AuthProviderIdentity, get_auth_provider_identity


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'notifications-workflow.db'}"


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
def notifications_env(monkeypatch: pytest.MonkeyPatch, session_factory):
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    monkeypatch.setenv("TWA_NOTIFICATION_EMAIL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()

    sent_emails: list[dict[str, str]] = []
    state = {
        "identity": AuthProviderIdentity(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="jobseeker@example.com",
            auth_provider_role="user",
        )
    }

    def fake_send_email_message(*, recipient: str, subject: str, body: str) -> None:
        sent_emails.append({"recipient": recipient, "subject": subject, "body": body})

    monkeypatch.setattr(
        notifications_service, "send_email_message", fake_send_email_message
    )

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    def override_identity() -> AuthProviderIdentity:
        return state["identity"]

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_auth_provider_identity] = override_identity

    with TestClient(app) as client:
        yield client, state, session_factory, sent_emails

    app.dependency_overrides.clear()
    get_settings.cache_clear()


def switch_identity(
    state: dict[str, AuthProviderIdentity],
    *,
    auth_user_id: uuid.UUID,
    email: str,
    auth_provider_role: str,
) -> None:
    state["identity"] = AuthProviderIdentity(
        auth_user_id=auth_user_id,
        email=email,
        auth_provider_role=auth_provider_role,
    )


def seed_staff(
    session_factory, *, auth_user_id: uuid.UUID, email: str = "staff@example.com"
) -> AppUser:
    with session_factory() as session:
        user = AppUser(
            auth_user_id=auth_user_id,
            email=email,
            auth_provider_role="admin",
            app_role=AppRole.STAFF,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def seed_jobseeker(
    session_factory,
    *,
    auth_user_id: uuid.UUID,
    email: str = "jobseeker@example.com",
    full_name: str = "Jane Doe",
) -> tuple[AppUser, Jobseeker]:
    with session_factory() as session:
        user = AppUser(
            auth_user_id=auth_user_id,
            email=email,
            auth_provider_role="user",
            app_role=AppRole.JOBSEEKER,
            is_active=True,
        )
        session.add(user)
        session.flush()
        jobseeker = Jobseeker(
            app_user_id=user.id,
            full_name=full_name,
            phone="3145550101",
            address="123 Main St",
            city="St. Louis",
            zip="63103",
            transit_type=TransitType.PUBLIC_TRANSIT,
            status=JobseekerStatus.ACTIVE,
        )
        session.add(jobseeker)
        session.commit()
        session.refresh(user)
        session.refresh(jobseeker)
        return user, jobseeker


def seed_employer(
    session_factory,
    *,
    auth_user_id: uuid.UUID,
    email: str = "employer@example.com",
    org_name: str = "Northside Logistics",
    review_status: EmployerReviewStatus = EmployerReviewStatus.APPROVED,
) -> tuple[AppUser, Employer]:
    with session_factory() as session:
        user = AppUser(
            auth_user_id=auth_user_id,
            email=email,
            auth_provider_role="user",
            app_role=AppRole.EMPLOYER,
            is_active=True,
        )
        session.add(user)
        session.flush()
        employer = Employer(
            app_user_id=user.id,
            org_name=org_name,
            review_status=review_status,
        )
        session.add(employer)
        session.commit()
        session.refresh(user)
        session.refresh(employer)
        return user, employer


def seed_listing(
    session_factory,
    *,
    employer_id: uuid.UUID,
    title: str = "Warehouse Associate",
    review_status: ListingReviewStatus = ListingReviewStatus.APPROVED,
    lifecycle_status: ListingLifecycleStatus = ListingLifecycleStatus.OPEN,
) -> JobListing:
    with session_factory() as session:
        listing = JobListing(
            employer_id=employer_id,
            title=title,
            city="St. Louis",
            zip="63103",
            transit_required=TransitRequirement.ANY,
            transit_accessible=True,
            job_lat=38.6270,
            job_lon=-90.1994,
            review_status=review_status,
            lifecycle_status=lifecycle_status,
        )
        session.add(listing)
        session.commit()
        session.refresh(listing)
        return listing


def seed_application(
    session_factory,
    *,
    jobseeker_id: uuid.UUID,
    listing_id: uuid.UUID,
    status: ApplicationStatus = ApplicationStatus.SUBMITTED,
) -> Application:
    with session_factory() as session:
        application = Application(
            jobseeker_id=jobseeker_id,
            job_listing_id=listing_id,
            status=status,
        )
        session.add(application)
        session.commit()
        session.refresh(application)
        return application


def test_staff_can_get_and_update_notification_config(notifications_env) -> None:
    client, state, session_factory, _ = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    switch_identity(
        state,
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )

    get_response = client.get("/api/v1/admin/config/notifications")
    assert get_response.status_code == 200
    initial_payload = get_response.json()
    assert initial_payload["notify_staff_on_apply"] is True
    assert initial_payload["notify_employer_on_apply"] is False
    assert initial_payload["share_applicants_with_employer"] is False
    assert initial_payload["updated_by"] is None
    assert initial_payload["updated_at"] is not None

    patch_response = client.patch(
        "/api/v1/admin/config/notifications",
        json={
            "notify_employer_on_apply": True,
            "share_applicants_with_employer": True,
        },
    )
    assert patch_response.status_code == 200
    payload = patch_response.json()["config"]
    assert payload["notify_staff_on_apply"] is True
    assert payload["notify_employer_on_apply"] is True
    assert payload["share_applicants_with_employer"] is True
    assert payload["updated_by"] == str(staff.id)
    assert payload["updated_at"] is not None

    with session_factory() as session:
        config = session.get(NotificationConfig, 1)
        audit_entry = session.execute(
            select(AuditLog).where(AuditLog.action == "notification_config_updated")
        ).scalar_one()
    assert config is not None
    assert config.notify_employer_on_apply is True
    assert config.share_applicants_with_employer is True
    assert audit_entry.actor_id == staff.id


def test_application_submission_notifies_staff_by_default(notifications_env) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, employer = seed_employer(
        session_factory, auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    )
    _, jobseeker = seed_jobseeker(
        session_factory, auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    )
    listing = seed_listing(session_factory, employer_id=employer.id)
    switch_identity(
        state,
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="jobseeker@example.com",
        auth_provider_role="user",
    )

    response = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing.id)}
    )
    assert response.status_code == 200

    with session_factory() as session:
        notifications = session.execute(select(Notification)).scalars().all()

    assert len(notifications) == 1
    assert notifications[0].app_user_id == staff.id
    assert notifications[0].type == "application_submitted"
    assert notifications[0].channel == NotificationChannel.IN_APP
    assert {email["recipient"] for email in sent_emails} == {staff.email}
    assert employer_user.id not in {
        notification.app_user_id for notification in notifications
    }


def test_application_submission_can_notify_employer_when_toggle_enabled(
    notifications_env,
) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, employer = seed_employer(
        session_factory, auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    )
    seed_jobseeker(
        session_factory, auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    )
    listing = seed_listing(
        session_factory, employer_id=employer.id, title="Packaging Associate"
    )

    switch_identity(
        state,
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    config_patch = client.patch(
        "/api/v1/admin/config/notifications",
        json={"notify_employer_on_apply": True},
    )
    assert config_patch.status_code == 200

    switch_identity(
        state,
        auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        email="jobseeker@example.com",
        auth_provider_role="user",
    )
    response = client.post(
        "/api/v1/applications", json={"job_listing_id": str(listing.id)}
    )
    assert response.status_code == 200

    with session_factory() as session:
        notifications = (
            session.execute(
                select(Notification).where(Notification.type == "application_submitted")
            )
            .scalars()
            .all()
        )

    recipients = {notification.app_user_id for notification in notifications}
    assert recipients == {staff.id, employer_user.id}
    assert {email["recipient"] for email in sent_emails} == {
        staff.email,
        employer_user.email,
    }


def test_employer_bootstrap_notifies_staff_of_pending_review(notifications_env) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )

    switch_identity(
        state,
        auth_user_id=uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        email="new-employer@example.com",
        auth_provider_role="user",
    )
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "role": "employer",
            "employer_profile": {
                "org_name": "Fresh Start Staffing",
                "contact_name": "Taylor Reed",
                "phone": "3145550123",
            },
        },
    )
    assert response.status_code == 200

    with session_factory() as session:
        notifications = (
            session.execute(
                select(Notification).where(
                    Notification.type == "employer_review_requested"
                )
            )
            .scalars()
            .all()
        )

    assert len(notifications) == 1
    assert notifications[0].app_user_id == staff.id
    assert notifications[0].channel == NotificationChannel.IN_APP
    assert notifications[0].title == "Employer awaiting review"
    assert {email["recipient"] for email in sent_emails} == {staff.email}


def test_employer_profile_update_notifies_staff_of_pending_review(
    notifications_env,
) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, employer = seed_employer(
        session_factory,
        auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        review_status=EmployerReviewStatus.APPROVED,
    )

    switch_identity(
        state,
        auth_user_id=employer_user.auth_user_id,
        email=employer_user.email,
        auth_provider_role="user",
    )
    response = client.patch(
        "/api/v1/employers/me",
        json={"address": "500 Market St", "city": "St. Louis", "zip": "63101"},
    )
    assert response.status_code == 200

    with session_factory() as session:
        refreshed_employer = session.execute(
            select(Employer).where(Employer.id == employer.id)
        ).scalar_one()
        notifications = (
            session.execute(
                select(Notification).where(
                    Notification.type == "employer_review_requested"
                )
            )
            .scalars()
            .all()
        )

    assert refreshed_employer.review_status == EmployerReviewStatus.PENDING
    assert len(notifications) == 1
    assert notifications[0].app_user_id == staff.id
    assert notifications[0].channel == NotificationChannel.IN_APP
    assert notifications[0].title == "Employer awaiting review"
    assert notifications[0].body == (
        "Northside Logistics updated their employer profile and is awaiting staff review."
    )
    assert {email["recipient"] for email in sent_emails} == {staff.email}


def test_listing_submission_notifies_staff_of_pending_review(notifications_env) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, _ = seed_employer(
        session_factory, auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    )

    switch_identity(
        state,
        auth_user_id=employer_user.auth_user_id,
        email=employer_user.email,
        auth_provider_role="user",
    )
    response = client.post(
        "/api/v1/employer/listings",
        json={
            "title": "Warehouse Coordinator",
            "description": "Coordinate incoming and outgoing shipments.",
            "transit_required": "any",
        },
    )
    assert response.status_code == 200

    with session_factory() as session:
        notifications = (
            session.execute(
                select(Notification).where(
                    Notification.type == "listing_review_requested"
                )
            )
            .scalars()
            .all()
        )

    assert len(notifications) == 1
    assert notifications[0].app_user_id == staff.id
    assert notifications[0].channel == NotificationChannel.IN_APP
    assert notifications[0].title == "Job listing awaiting review"
    assert {email["recipient"] for email in sent_emails} == {staff.email}


def test_employer_review_and_listing_review_notifications_are_readable(
    notifications_env,
) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, employer = seed_employer(
        session_factory,
        auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        review_status=EmployerReviewStatus.PENDING,
    )
    listing = seed_listing(
        session_factory,
        employer_id=employer.id,
        title="Office Assistant",
        review_status=ListingReviewStatus.PENDING,
    )

    switch_identity(
        state,
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_review = client.patch(
        f"/api/v1/admin/employers/{employer.id}",
        json={"review_status": "approved"},
    )
    assert employer_review.status_code == 200

    listing_review = client.patch(
        f"/api/v1/admin/listings/{listing.id}",
        json={"review_status": "approved"},
    )
    assert listing_review.status_code == 200

    switch_identity(
        state,
        auth_user_id=employer_user.auth_user_id,
        email=employer_user.email,
        auth_provider_role="user",
    )
    inbox = client.get("/api/v1/notifications/me", params={"unread_only": "true"})
    assert inbox.status_code == 200
    items = inbox.json()["items"]
    assert {item["type"] for item in items} == {"listing_approved", "employer_approved"}

    read_response = client.patch(f"/api/v1/notifications/me/{items[0]['id']}/read")
    assert read_response.status_code == 200
    assert read_response.json()["notification"]["read_at"] is not None

    unread = client.get("/api/v1/notifications/me", params={"unread_only": "true"})
    assert unread.status_code == 200
    assert unread.json()["meta"]["total_items"] == 1
    assert {email["recipient"] for email in sent_emails} == {employer_user.email}


def test_user_can_mark_all_notifications_as_read(notifications_env) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    employer_user, employer = seed_employer(
        session_factory,
        auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        review_status=EmployerReviewStatus.PENDING,
    )
    listing = seed_listing(
        session_factory,
        employer_id=employer.id,
        title="Office Assistant",
        review_status=ListingReviewStatus.PENDING,
    )

    switch_identity(
        state,
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    employer_review = client.patch(
        f"/api/v1/admin/employers/{employer.id}",
        json={"review_status": "approved"},
    )
    assert employer_review.status_code == 200

    listing_review = client.patch(
        f"/api/v1/admin/listings/{listing.id}",
        json={"review_status": "approved"},
    )
    assert listing_review.status_code == 200

    switch_identity(
        state,
        auth_user_id=employer_user.auth_user_id,
        email=employer_user.email,
        auth_provider_role="user",
    )
    read_all_response = client.patch("/api/v1/notifications/me/read-all")
    assert read_all_response.status_code == 200
    payload = read_all_response.json()
    assert payload["marked_count"] == 2
    assert len(payload["notifications"]) == 2
    assert all(
        notification["read_at"] is not None for notification in payload["notifications"]
    )

    unread = client.get("/api/v1/notifications/me", params={"unread_only": "true"})
    assert unread.status_code == 200
    assert unread.json()["meta"]["total_items"] == 0
    assert {email["recipient"] for email in sent_emails} == {employer_user.email}


def test_application_status_updates_notify_jobseeker(notifications_env) -> None:
    client, state, session_factory, sent_emails = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    jobseeker_user, jobseeker = seed_jobseeker(
        session_factory, auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    )
    _, employer = seed_employer(
        session_factory, auth_user_id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    )
    listing = seed_listing(
        session_factory, employer_id=employer.id, title="Data Entry Clerk"
    )
    application = seed_application(
        session_factory, jobseeker_id=jobseeker.id, listing_id=listing.id
    )

    switch_identity(
        state,
        auth_user_id=staff.auth_user_id,
        email=staff.email,
        auth_provider_role="admin",
    )
    reviewed = client.patch(
        f"/api/v1/admin/applications/{application.id}",
        json={"status": "reviewed"},
    )
    assert reviewed.status_code == 200

    hired = client.patch(
        f"/api/v1/admin/applications/{application.id}",
        json={"status": "hired"},
    )
    assert hired.status_code == 200

    switch_identity(
        state,
        auth_user_id=jobseeker_user.auth_user_id,
        email=jobseeker_user.email,
        auth_provider_role="user",
    )
    inbox = client.get("/api/v1/notifications/me", params={"unread_only": "true"})
    assert inbox.status_code == 200
    assert {item["type"] for item in inbox.json()["items"]} == {
        "application_reviewed",
        "application_hired",
    }
    assert {email["recipient"] for email in sent_emails} == {jobseeker_user.email}


def test_notification_broker_publishes_new_events(notifications_env) -> None:
    _, _, session_factory, _ = notifications_env
    staff = seed_staff(
        session_factory, auth_user_id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    )
    subscriber_id = "test-stream-subscriber"
    subscriber_queue = notifications_service.notification_stream_broker.subscribe(
        app_user_id=staff.id,
        subscriber_id=subscriber_id,
    )

    try:
        with session_factory() as session:
            notifications_service.safe_dispatch_notification(
                session,
                event_type="staff_test_event",
                recipients=[
                    notifications_service.NotificationRecipient(
                        app_user_id=staff.id, email=staff.email
                    )
                ],
                title="Stream test",
                body="A live notification arrived.",
                send_email=False,
            )
        created_event = subscriber_queue.get(timeout=1)
        assert created_event.event == "notification.created"
        assert created_event.payload["notification"]["type"] == "staff_test_event"
        assert created_event.payload["notification"]["title"] == "Stream test"
    finally:
        notifications_service.notification_stream_broker.unsubscribe(
            app_user_id=staff.id,
            subscriber_id=subscriber_id,
        )


def test_notification_stream_does_not_hold_caller_session(
    notifications_env,
) -> None:
    """The SSE route must not reuse a caller-provided session for the snapshot.

    Layer 1 guarantees: the stream opens a short-lived session per snapshot via
    the injected session factory. A caller's session must never be touched by
    the stream and therefore must never end up in an open transaction.
    """
    _, _, session_factory, _ = notifications_env
    jobseeker_user, _ = seed_jobseeker(
        session_factory, auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    )

    class FakeRequest:
        async def is_disconnected(self) -> bool:
            return False

    async def read_first_stream_chunk() -> str:
        response = await stream_my_notifications(
            request=FakeRequest(),
            auth_context=AuthContext(
                auth_user_id=jobseeker_user.auth_user_id,
                email=jobseeker_user.email,
                auth_provider_role="user",
                app_user_id=jobseeker_user.id,
                app_role="jobseeker",
                is_active=True,
            ),
            session_factory=session_factory,
        )
        body_iterator = response.body_iterator
        assert body_iterator is not None

        try:
            return await anext(body_iterator)
        finally:
            await body_iterator.aclose()

    with session_factory() as unrelated_session:
        first_chunk = anyio.run(read_first_stream_chunk)

        assert "event: snapshot" in first_chunk
        assert not unrelated_session.in_transaction()
