from __future__ import annotations

import os
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppUser, NotificationConfig
from app.models.enums import AppRole


def ensure_notification_config(session: Session) -> NotificationConfig:
    config = session.get(NotificationConfig, 1)
    if config is None:
        config = NotificationConfig(id=1)
        session.add(config)
        session.flush()
    return config


def seed_staff_user(
    session: Session,
    *,
    auth_user_id: uuid.UUID,
    email: str,
    auth_provider_role: str = "admin",
) -> AppUser:
    statement = select(AppUser).where(AppUser.auth_user_id == auth_user_id)
    app_user = session.execute(statement).scalar_one_or_none()

    if app_user is None:
        app_user = AppUser(
            auth_user_id=auth_user_id,
            email=email,
            auth_provider_role=auth_provider_role,
            app_role=AppRole.STAFF,
            is_active=True,
        )
        session.add(app_user)
    else:
        app_user.email = email
        app_user.auth_provider_role = auth_provider_role
        app_user.app_role = AppRole.STAFF
        app_user.is_active = True

    session.flush()
    return app_user


def seed_defaults(
    session: Session,
    *,
    staff_auth_user_id: uuid.UUID | None = None,
    staff_email: str | None = None,
    staff_auth_provider_role: str = "admin",
) -> dict[str, bool]:
    results = {"notification_config_created": False, "staff_seeded": False}

    existing_config = session.get(NotificationConfig, 1)
    ensure_notification_config(session)
    results["notification_config_created"] = existing_config is None

    if staff_auth_user_id is not None or staff_email is not None:
        if staff_auth_user_id is None or staff_email is None:
            raise ValueError(
                "Both staff_auth_user_id and staff_email are required when seeding a staff user."
            )
        seed_staff_user(
            session,
            auth_user_id=staff_auth_user_id,
            email=staff_email,
            auth_provider_role=staff_auth_provider_role,
        )
        results["staff_seeded"] = True

    session.commit()
    return results


def _env_uuid(name: str) -> uuid.UUID | None:
    value = os.getenv(name)
    if not value:
        return None
    return uuid.UUID(value)
