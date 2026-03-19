from __future__ import annotations

import logging
import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.audit import build_audit_snapshot, write_audit
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.main import create_app
from app.models import AppUser, AuditLog
from app.models.enums import AppRole
from app.services.common import (
    PaginationParams,
    SortParams,
    apply_filters,
    apply_pagination,
    apply_sorting,
    build_paginated_response,
    ensure_found,
    ensure_permission,
)


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'test.db'}"


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
def session(session_factory) -> Generator[Session, None, None]:
    with session_factory() as session:
        yield session


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    @app.get("/_test/error")
    def test_error_route() -> dict[str, bool]:
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client

    get_settings.cache_clear()



def test_write_audit_creates_log_entry(session: Session) -> None:
    app_user = AppUser(
        auth_user_id=uuid.uuid4(),
        email="staff@example.com",
        auth_provider_role="admin",
        app_role=AppRole.STAFF,
        is_active=True,
    )
    session.add(app_user)
    session.flush()

    audit_entry = write_audit(
        session,
        actor_id=app_user.id,
        action="employer.approved",
        entity_type="employer",
        entity_id=uuid.uuid4(),
        old_value={"review_status": "pending"},
        new_value={"review_status": "approved"},
    )
    session.commit()

    stored = session.execute(select(AuditLog).where(AuditLog.id == audit_entry.id)).scalar_one()
    assert stored.actor_id == app_user.id
    assert stored.action == "employer.approved"
    assert stored.old_value == {"review_status": "pending"}
    assert stored.new_value == {"review_status": "approved"}



def test_build_audit_snapshot_serializes_sqlalchemy_models(session: Session) -> None:
    app_user = AppUser(
        auth_user_id=uuid.uuid4(),
        email="user@example.com",
        auth_provider_role="user",
        app_role=AppRole.JOBSEEKER,
        is_active=True,
    )
    session.add(app_user)
    session.flush()

    snapshot = build_audit_snapshot(app_user)

    assert snapshot is not None
    assert snapshot["email"] == "user@example.com"
    assert snapshot["app_role"] == "jobseeker"
    assert snapshot["id"] == str(app_user.id)



def test_common_query_helpers_apply_filters_sorting_and_pagination(session: Session) -> None:
    for email in ["c@example.com", "a@example.com", "b@example.com"]:
        session.add(
            AppUser(
                auth_user_id=uuid.uuid4(),
                email=email,
                auth_provider_role="user",
                app_role=AppRole.JOBSEEKER,
                is_active=True,
            )
        )
    session.commit()

    statement = select(AppUser)
    statement = apply_filters(
        statement,
        filters={"app_role": AppRole.JOBSEEKER.value},
        allowed_filters={"app_role": AppUser.app_role},
    )
    statement = apply_sorting(
        statement,
        sort=SortParams(sort_by="email", direction="asc"),
        allowed_sorts={"email": AppUser.email},
    )
    statement = apply_pagination(statement, PaginationParams(page=2, page_size=1))

    items = session.execute(statement).scalars().all()
    response = build_paginated_response(
        items=[item.email for item in items],
        total_items=3,
        pagination=PaginationParams(page=2, page_size=1),
    )

    assert [item.email for item in items] == ["b@example.com"]
    assert response.meta.page == 2
    assert response.meta.page_size == 1
    assert response.meta.total_items == 3
    assert response.meta.total_pages == 3



def test_common_query_helpers_raise_for_invalid_usage() -> None:
    with pytest.raises(AppError) as invalid_sort:
        apply_sorting(select(AppUser), sort=SortParams(sort_by="missing", direction="asc"), allowed_sorts={"email": AppUser.email})
    assert invalid_sort.value.code == "INVALID_SORT"

    with pytest.raises(AppError) as invalid_filter:
        apply_filters(select(AppUser), filters={"missing": "x"}, allowed_filters={"email": AppUser.email})
    assert invalid_filter.value.code == "INVALID_FILTER"

    with pytest.raises(AppError) as not_found:
        ensure_found(None, entity_name="Employer")
    assert not_found.value.code == "NOT_FOUND"

    with pytest.raises(AppError) as forbidden:
        ensure_permission(False, detail="Nope")
    assert forbidden.value.code == "FORBIDDEN"



def test_request_logging_adds_request_id_header_and_logs(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO, logger="twa.http")

    response = client.get("/health", headers={"X-Request-ID": "req-123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-123"
    assert '"event": "http_request"' in caplog.text
    assert '"request_id": "req-123"' in caplog.text



def test_unhandled_exceptions_use_standard_error_shape(client: TestClient) -> None:
    response = client.get("/_test/error", headers={"X-Request-ID": "req-500"})

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
            "request_id": "req-500",
        }
    }
