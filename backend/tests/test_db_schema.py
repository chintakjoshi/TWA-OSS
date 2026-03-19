from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.seeds import ensure_notification_config, seed_defaults
from app.models import AppUser, NotificationConfig
from app.models.enums import AppRole


@pytest.fixture()
def session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        yield session


def test_metadata_includes_core_tables() -> None:
    expected_tables = {
        "app_users",
        "applications",
        "audit_log",
        "employers",
        "job_listings",
        "jobseekers",
        "notification_config",
        "notifications",
    }

    assert expected_tables.issubset(Base.metadata.tables.keys())


def test_ensure_notification_config_is_idempotent(session: Session) -> None:
    first = ensure_notification_config(session)
    second = ensure_notification_config(session)
    session.commit()

    rows = session.execute(select(NotificationConfig)).scalars().all()

    assert first.id == 1
    assert second.id == 1
    assert len(rows) == 1


def test_seed_defaults_creates_staff_user_and_notification_config(session: Session) -> None:
    auth_user_id = uuid.uuid4()

    results = seed_defaults(
        session,
        staff_auth_user_id=auth_user_id,
        staff_email="staff@example.com",
        staff_auth_provider_role="admin",
    )

    app_user = session.execute(select(AppUser).where(AppUser.auth_user_id == auth_user_id)).scalar_one()
    config = session.get(NotificationConfig, 1)

    assert results == {"notification_config_created": True, "staff_seeded": True}
    assert app_user.app_role == AppRole.STAFF
    assert app_user.email == "staff@example.com"
    assert config is not None


def test_seed_defaults_is_idempotent_for_staff(session: Session) -> None:
    auth_user_id = uuid.uuid4()

    seed_defaults(
        session,
        staff_auth_user_id=auth_user_id,
        staff_email="staff@example.com",
        staff_auth_provider_role="admin",
    )
    results = seed_defaults(
        session,
        staff_auth_user_id=auth_user_id,
        staff_email="staff@example.com",
        staff_auth_provider_role="admin",
    )

    users = session.execute(select(AppUser)).scalars().all()
    configs = session.execute(select(NotificationConfig)).scalars().all()

    assert results == {"notification_config_created": False, "staff_seeded": True}
    assert len(users) == 1
    assert len(configs) == 1