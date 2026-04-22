"""Tests for the notifications SSE route.

These tests enforce the Layer 1 correctness contract of
``GET /api/v1/notifications/stream``:

* The route does not own a DB session for the lifetime of the stream.
* Snapshot reads run on a worker thread so the async event loop is not
  blocked by synchronous SQLAlchemy I/O.
* A short-lived session is opened per snapshot and closed immediately.
* Each snapshot is bounded by a timeout; on timeout the stream closes
  cleanly and the failure is logged.
"""

from __future__ import annotations

import inspect
import logging
import tempfile
import uuid
from collections.abc import Generator
from pathlib import Path
from typing import Any

import anyio
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.auth import AuthContext
from app.core.config import get_settings
from app.db.session import get_db_session, get_db_session_factory
from app.main import create_app
from app.models import AppUser, Jobseeker
from app.models.enums import AppRole, JobseekerStatus, TransitType
from app.routers.v1 import notifications as notifications_router


@pytest.fixture()
def sqlite_url() -> Generator[str, None, None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        yield f"sqlite+pysqlite:///{Path(temp_dir) / 'notifications-stream.db'}"


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
def jobseeker_user(session_factory) -> AppUser:
    with session_factory() as session:
        user = AppUser(
            auth_user_id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="jobseeker@example.com",
            auth_provider_role="user",
            app_role=AppRole.JOBSEEKER,
            is_active=True,
        )
        session.add(user)
        session.flush()
        jobseeker = Jobseeker(
            app_user_id=user.id,
            full_name="Jane Doe",
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
        return user


@pytest.fixture()
def configured_app(monkeypatch: pytest.MonkeyPatch, session_factory):
    """Build the FastAPI app and wire the snapshot session-factory seam to the test DB."""
    monkeypatch.setenv("TWA_AUTH_ENABLED", "false")
    monkeypatch.setenv("TWA_DEBUG", "false")
    get_settings.cache_clear()
    app = create_app()

    def override_db_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_db_session_factory] = lambda: session_factory

    try:
        yield app
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def _auth_context_for(user: AppUser) -> AuthContext:
    return AuthContext(
        auth_user_id=user.auth_user_id,
        email=user.email,
        auth_provider_role=user.auth_provider_role,
        app_user_id=user.id,
        app_role=user.app_role,
        is_active=True,
    )


class _ConnectedRequest:
    """Minimal async-compatible stand-in for fastapi.Request in the stream handler."""

    async def is_disconnected(self) -> bool:
        return False


async def _collect_first_snapshot(app, user: AppUser) -> str:
    response = await notifications_router.stream_my_notifications(
        request=_ConnectedRequest(),  # type: ignore[arg-type]
        auth_context=_auth_context_for(user),
        session_factory=app.dependency_overrides[get_db_session_factory](),
    )
    body_iterator = response.body_iterator
    assert body_iterator is not None
    try:
        return await anext(body_iterator)
    finally:
        await body_iterator.aclose()


def test_stream_route_does_not_depend_on_get_db_session(configured_app) -> None:
    """The SSE handler must not hold a request-scoped DB session.

    A session dependency would be resolved at request time and pinned to the
    connection for the entire stream lifetime, starving the connection pool.
    """
    signature = inspect.signature(notifications_router.stream_my_notifications)
    assert "session" not in signature.parameters, (
        "stream_my_notifications must not accept a `session` dependency — the "
        "stream lifetime would pin a pooled DB connection."
    )


def test_stream_emits_initial_snapshot(configured_app, jobseeker_user) -> None:
    chunk = anyio.run(_collect_first_snapshot, configured_app, jobseeker_user)
    assert "event: snapshot" in chunk


def test_stream_opens_and_closes_session_per_snapshot(
    configured_app, jobseeker_user, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Each snapshot must open its own session and close it before returning control."""
    factory_override = configured_app.dependency_overrides[get_db_session_factory]
    real_factory = factory_override()

    open_count = 0
    close_count = 0

    class TrackingSession:
        def __init__(self) -> None:
            nonlocal open_count
            open_count += 1
            self._inner = real_factory()

        def __enter__(self) -> Session:
            return self._inner.__enter__()

        def __exit__(self, *exc_info: Any) -> None:
            nonlocal close_count
            try:
                self._inner.__exit__(*exc_info)
            finally:
                close_count += 1

    def tracking_factory() -> TrackingSession:
        return TrackingSession()

    configured_app.dependency_overrides[get_db_session_factory] = (
        lambda: tracking_factory
    )

    chunk = anyio.run(_collect_first_snapshot, configured_app, jobseeker_user)
    assert "event: snapshot" in chunk

    assert open_count == 1, "expected exactly one session opened for the snapshot"
    assert close_count == 1, (
        "expected the snapshot session to be closed before yielding back to the "
        "async generator"
    )


def test_stream_runs_snapshot_off_the_event_loop(
    configured_app, jobseeker_user, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The snapshot loader must be dispatched via fastapi.concurrency.run_in_threadpool.

    This enforces that synchronous SQLAlchemy I/O does not execute inline in the
    async generator, where it would block the event loop.
    """
    dispatches: list[Any] = []
    real_run_in_threadpool = notifications_router.run_in_threadpool

    async def spy_run_in_threadpool(func, *args, **kwargs):
        dispatches.append(func)
        return await real_run_in_threadpool(func, *args, **kwargs)

    monkeypatch.setattr(
        notifications_router, "run_in_threadpool", spy_run_in_threadpool
    )

    chunk = anyio.run(_collect_first_snapshot, configured_app, jobseeker_user)
    assert "event: snapshot" in chunk
    assert dispatches, (
        "snapshot loader was never dispatched via run_in_threadpool — sync DB "
        "I/O is running on the event loop"
    )


def test_stream_closes_and_logs_when_snapshot_times_out(
    configured_app,
    jobseeker_user,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A snapshot that exceeds the timeout must close the stream and log a warning.

    We assert the *async-side* timeout contract: if the awaitable that performs
    the snapshot does not resolve within ``STREAM_SNAPSHOT_TIMEOUT_SECONDS``,
    the route bails out cleanly, logs, and emits no snapshot frame. We replace
    ``run_in_threadpool`` with an awaitable that never resolves so the timeout
    is fully deterministic and does not depend on real wall-clock sleeps.
    """
    monkeypatch.setattr(notifications_router, "STREAM_SNAPSHOT_TIMEOUT_SECONDS", 0.05)

    async def never_resolving(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        await anyio.sleep_forever()
        return {}  # pragma: no cover

    monkeypatch.setattr(notifications_router, "run_in_threadpool", never_resolving)

    async def drain_stream() -> list[str]:
        response = await notifications_router.stream_my_notifications(
            request=_ConnectedRequest(),  # type: ignore[arg-type]
            auth_context=_auth_context_for(jobseeker_user),
            session_factory=configured_app.dependency_overrides[
                get_db_session_factory
            ](),
        )
        body_iterator = response.body_iterator
        assert body_iterator is not None

        collected: list[str] = []
        try:
            async for chunk in body_iterator:
                collected.append(chunk)
        finally:
            await body_iterator.aclose()
        return collected

    caplog.set_level(logging.WARNING, logger="twa.notifications")
    chunks = anyio.run(drain_stream)

    assert all(
        "event: snapshot" not in c for c in chunks
    ), "stream should not have emitted a snapshot after timing out"
    assert any(
        "notification_stream_snapshot_timeout" in record.message
        for record in caplog.records
    ), "expected a warning log for the snapshot timeout"


def test_stream_closes_and_logs_when_snapshot_fails(
    configured_app,
    jobseeker_user,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def failing_snapshot(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("snapshot failed")

    monkeypatch.setattr(notifications_router, "run_in_threadpool", failing_snapshot)

    async def drain_stream() -> list[str]:
        response = await notifications_router.stream_my_notifications(
            request=_ConnectedRequest(),  # type: ignore[arg-type]
            auth_context=_auth_context_for(jobseeker_user),
            session_factory=configured_app.dependency_overrides[
                get_db_session_factory
            ](),
        )
        body_iterator = response.body_iterator
        assert body_iterator is not None

        collected: list[str] = []
        try:
            async for chunk in body_iterator:
                collected.append(chunk)
        finally:
            await body_iterator.aclose()
        return collected

    caplog.set_level(logging.ERROR, logger="twa.notifications")
    chunks = anyio.run(drain_stream)

    assert all(
        "event: snapshot" not in c for c in chunks
    ), "stream should close before emitting a snapshot when snapshot loading fails"
    assert any(
        "notification_stream_snapshot_failed" in record.message
        for record in caplog.records
    ), "expected an error log for unexpected snapshot failures"
