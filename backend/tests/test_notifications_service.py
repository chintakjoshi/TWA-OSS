from __future__ import annotations

import logging
import uuid
from unittest.mock import Mock

import pytest
from sqlalchemy.orm import Session

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
