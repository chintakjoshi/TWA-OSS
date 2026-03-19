from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import write_audit
from app.db.seeds import ensure_notification_config
from app.models import AppUser, Application, Employer, JobListing, Notification, NotificationConfig
from app.models.enums import AppRole, ApplicationStatus, NotificationChannel
from app.schemas.notifications import (
    NotificationConfigPayload,
    NotificationPayload,
    NotificationReadResultPayload,
)
from app.services.common import (
    PaginationParams,
    apply_pagination,
    build_paginated_response,
)
from app.services.email import EmailDeliveryError, send_email_message

logger = logging.getLogger("twa.notifications")


@dataclass(slots=True)
class NotificationRecipient:
    app_user_id: UUID
    email: str



def serialize_notification_config(config: NotificationConfig) -> NotificationConfigPayload:
    return NotificationConfigPayload(
        notify_staff_on_apply=config.notify_staff_on_apply,
        notify_employer_on_apply=config.notify_employer_on_apply,
        share_applicants_with_employer=config.share_applicants_with_employer,
        updated_by=config.updated_by,
        updated_at=config.updated_at,
    )



def serialize_notification(notification: Notification) -> NotificationPayload:
    return NotificationPayload(
        id=notification.id,
        type=notification.type,
        channel=notification.channel.value,
        title=notification.title,
        body=notification.body,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )



def serialize_notification_read_result(notification: Notification) -> NotificationReadResultPayload:
    return NotificationReadResultPayload(id=notification.id, read_at=notification.read_at)



def get_notification_config(session: Session, *, persist_if_missing: bool = False) -> NotificationConfig:
    config = ensure_notification_config(session)
    if persist_if_missing and session.in_transaction():
        session.commit()
        session.refresh(config)
    return config



def update_notification_config(
    session: Session,
    *,
    actor_id: UUID,
    notify_staff_on_apply: bool | None,
    notify_employer_on_apply: bool | None,
    share_applicants_with_employer: bool | None,
) -> NotificationConfig:
    config = ensure_notification_config(session)
    old_value = serialize_notification_config(config).model_dump(mode="json")

    if notify_staff_on_apply is not None:
        config.notify_staff_on_apply = notify_staff_on_apply
    if notify_employer_on_apply is not None:
        config.notify_employer_on_apply = notify_employer_on_apply
    if share_applicants_with_employer is not None:
        config.share_applicants_with_employer = share_applicants_with_employer

    config.updated_by = actor_id
    config.updated_at = datetime.now(timezone.utc)
    session.flush()
    write_audit(
        session,
        actor_id=actor_id,
        action="notification_config_updated",
        entity_type="notification_config",
        entity_id=None,
        old_value=old_value,
        new_value=serialize_notification_config(config).model_dump(mode="json"),
    )
    session.commit()
    session.refresh(config)
    return config



def list_notifications_for_user(
    session: Session,
    *,
    app_user_id: UUID,
    pagination: PaginationParams,
    unread_only: bool = False,
):
    base_statement = select(Notification).where(
        Notification.app_user_id == app_user_id,
        Notification.channel == NotificationChannel.IN_APP,
    )
    if unread_only:
        base_statement = base_statement.where(Notification.read_at.is_(None))

    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = base_statement.order_by(Notification.created_at.desc())
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).scalars().all()
    return build_paginated_response(
        items=[serialize_notification(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )



def get_notification_for_user(session: Session, *, notification_id: UUID, app_user_id: UUID) -> Notification | None:
    statement = select(Notification).where(
        Notification.id == notification_id,
        Notification.app_user_id == app_user_id,
        Notification.channel == NotificationChannel.IN_APP,
    )
    return session.execute(statement).scalar_one_or_none()



def mark_notification_read(session: Session, *, notification: Notification) -> Notification:
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        session.commit()
        session.refresh(notification)
    return notification



def _recipient_from_app_user(app_user: AppUser | None) -> NotificationRecipient | None:
    if app_user is None or not app_user.is_active:
        return None
    return NotificationRecipient(app_user_id=app_user.id, email=app_user.email)



def _get_staff_recipients(session: Session) -> list[NotificationRecipient]:
    statement = select(AppUser).where(AppUser.app_role == AppRole.STAFF, AppUser.is_active.is_(True))
    users = session.execute(statement).scalars().all()
    return [recipient for user in users if (recipient := _recipient_from_app_user(user)) is not None]



def dispatch_notification(
    session: Session,
    *,
    event_type: str,
    recipients: list[NotificationRecipient],
    title: str,
    body: str,
    send_in_app: bool = True,
    send_email: bool = True,
) -> None:
    if not recipients:
        return

    if send_in_app:
        for recipient in recipients:
            session.add(
                Notification(
                    app_user_id=recipient.app_user_id,
                    type=event_type,
                    channel=NotificationChannel.IN_APP,
                    title=title,
                    body=body,
                )
            )
        session.commit()

    if send_email:
        for recipient in recipients:
            send_email_message(recipient=recipient.email, subject=title, body=body)



def safe_dispatch_notification(
    session: Session,
    *,
    event_type: str,
    recipients: list[NotificationRecipient],
    title: str,
    body: str,
    send_in_app: bool = True,
    send_email: bool = True,
) -> None:
    try:
        dispatch_notification(
            session,
            event_type=event_type,
            recipients=recipients,
            title=title,
            body=body,
            send_in_app=send_in_app,
            send_email=send_email,
        )
    except EmailDeliveryError as exc:
        logger.warning("notification_email_failed", extra={"event_type": event_type, "error": str(exc)})
    except Exception as exc:
        session.rollback()
        logger.warning("notification_dispatch_failed", extra={"event_type": event_type, "error": str(exc)})



def notify_application_submitted(session: Session, *, application: Application) -> None:
    config = get_notification_config(session)
    jobseeker_name = application.jobseeker.full_name or "A jobseeker"
    listing_title = application.job_listing.title

    if config.notify_staff_on_apply:
        safe_dispatch_notification(
            session,
            event_type="application_submitted",
            recipients=_get_staff_recipients(session),
            title="New application received",
            body=f"{jobseeker_name} applied to {listing_title}.",
        )

    if config.notify_employer_on_apply:
        employer_recipient = _recipient_from_app_user(application.job_listing.employer.app_user)
        if employer_recipient is not None:
            safe_dispatch_notification(
                session,
                event_type="application_submitted",
                recipients=[employer_recipient],
                title="New application received",
                body=f"{jobseeker_name} applied to {listing_title}.",
            )



def notify_employer_review_decision(session: Session, *, employer: Employer) -> None:
    recipient = _recipient_from_app_user(employer.app_user)
    if recipient is None:
        return

    if employer.review_status.value == "approved":
        safe_dispatch_notification(
            session,
            event_type="employer_approved",
            recipients=[recipient],
            title="Employer account approved",
            body=f"Your employer account for {employer.org_name} has been approved.",
        )
    elif employer.review_status.value == "rejected":
        safe_dispatch_notification(
            session,
            event_type="employer_rejected",
            recipients=[recipient],
            title="Employer account update",
            body=f"Your employer account for {employer.org_name} was not approved. Please review staff feedback and resubmit when ready.",
        )



def notify_listing_review_decision(session: Session, *, listing: JobListing) -> None:
    recipient = _recipient_from_app_user(listing.employer.app_user)
    if recipient is None:
        return

    if listing.review_status.value == "approved":
        safe_dispatch_notification(
            session,
            event_type="listing_approved",
            recipients=[recipient],
            title="Job listing approved",
            body=f"Your job listing '{listing.title}' has been approved.",
        )
    elif listing.review_status.value == "rejected":
        safe_dispatch_notification(
            session,
            event_type="listing_rejected",
            recipients=[recipient],
            title="Job listing update",
            body=f"Your job listing '{listing.title}' was not approved. Please review staff feedback and update it when ready.",
        )



def notify_application_status_changed(
    session: Session,
    *,
    application: Application,
    previous_status: ApplicationStatus,
) -> None:
    if application.status == previous_status:
        return

    recipient = _recipient_from_app_user(application.jobseeker.app_user)
    if recipient is None:
        return

    if application.status == ApplicationStatus.REVIEWED:
        safe_dispatch_notification(
            session,
            event_type="application_reviewed",
            recipients=[recipient],
            title="Application reviewed",
            body=f"Your application for {application.job_listing.title} is now under review.",
        )
    elif application.status == ApplicationStatus.HIRED:
        safe_dispatch_notification(
            session,
            event_type="application_hired",
            recipients=[recipient],
            title="Application marked hired",
            body=f"You have been marked hired for {application.job_listing.title}.",
        )
