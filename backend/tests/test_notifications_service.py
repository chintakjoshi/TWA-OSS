from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy.orm import Session

from app.models.enums import NotificationChannel
from app.services import notifications as notifications_service
from app.services.email import EmailDeliveryError


def test_safe_dispatch_notification_logs_email_failures_as_warning(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    session = Mock(spec=Session)

    def raise_email_failure(*args, **kwargs) -> None:
        raise EmailDeliveryError("smtp temporarily unavailable")

    monkeypatch.setattr(
        notifications_service, "dispatch_notification", raise_email_failure
    )

    caplog.set_level(logging.WARNING, logger="twa.notifications")

    notifications_service.safe_dispatch_notification(
        session,
        event_type="application_submitted",
        recipients=[],
        title="New application received",
        body="A jobseeker applied.",
    )

    assert any(
        record.levelno == logging.WARNING
        and record.message == "notification_email_failed"
        for record in caplog.records
    )
    session.rollback.assert_not_called()


def test_safe_dispatch_notification_logs_unknown_failures_as_error_without_rollback(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    session = Mock(spec=Session)

    def raise_unknown_failure(*args, **kwargs) -> None:
        raise RuntimeError("unexpected dispatch failure")

    monkeypatch.setattr(
        notifications_service, "dispatch_notification", raise_unknown_failure
    )

    caplog.set_level(logging.ERROR, logger="twa.notifications")

    notifications_service.safe_dispatch_notification(
        session,
        event_type="application_submitted",
        recipients=[
            notifications_service.NotificationRecipient(
                app_user_id=uuid.uuid4(),
                email="jobseeker@example.com",
            )
        ],
        title="New application received",
        body="A jobseeker applied.",
    )

    assert any(
        record.levelno == logging.ERROR
        and record.message == "notification_dispatch_failed"
        and record.exc_info is not None
        for record in caplog.records
    )
    session.rollback.assert_not_called()


def test_serialize_notification_includes_a_trusted_target_for_known_types() -> None:
    notification = SimpleNamespace(
        id=uuid.uuid4(),
        type="application_submitted",
        channel=NotificationChannel.IN_APP,
        title="New application received",
        body="A jobseeker applied.",
        read_at=None,
        created_at=datetime.now(timezone.utc),
    )

    payload = notifications_service.serialize_notification(notification)

    assert payload.target is not None
    assert payload.target.kind == "admin_route"
    assert payload.target.href == "/applications"
    assert payload.target.entity_id is None


def test_serialize_notification_omits_targets_for_unknown_notification_types() -> None:
    notification = SimpleNamespace(
        id=uuid.uuid4(),
        type="unknown_event",
        channel=NotificationChannel.IN_APP,
        title="Unknown",
        body="Unknown.",
        read_at=None,
        created_at=datetime.now(timezone.utc),
    )

    payload = notifications_service.serialize_notification(notification)

    assert payload.target is None
