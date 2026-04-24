from __future__ import annotations

import json
import logging
from queue import Empty
from uuid import UUID, uuid4

import anyio
from fastapi import APIRouter, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import (
    AuthContext,
    ensure_authenticated_app_context,
    get_auth_context,
)
from app.core.config import get_settings
from app.core.responses import PaginatedResponse
from app.db.session import SessionFactory, get_db_session, get_db_session_factory
from app.schemas.notifications import (
    NotificationBulkReadResponse,
    NotificationPayload,
    NotificationReadResponse,
)
from app.services.auth import (
    AuthProviderIdentity,
    get_auth_provider_identity,
    resolve_auth_context,
)
from app.services.common import PaginationParams, ensure_found, get_pagination_params
from app.services.notifications import (
    get_notification_for_user,
    list_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
    notification_stream_broker,
    serialize_notification_read_result,
    serialize_notification_snapshot,
)

logger = logging.getLogger("twa.notifications")

settings = get_settings()
router = APIRouter(
    prefix=f"{settings.api_v1_prefix}/notifications", tags=["notifications"]
)

STREAM_POLL_INTERVAL_SECONDS = 1
STREAM_RECONCILE_INTERVAL_SECONDS = 15
STREAM_SNAPSHOT_TIMEOUT_SECONDS = 5


def build_sse_message(*, event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _format_snapshot_message(snapshot: dict[str, object]) -> str:
    return build_sse_message(event="snapshot", data=snapshot)


def _load_stream_auth_context(
    *, request: Request, session_factory: SessionFactory, identity: AuthProviderIdentity
) -> AuthContext:
    with session_factory() as session:
        try:
            auth_context = resolve_auth_context(
                request=request,
                session=session,
                identity=identity,
            )
            return ensure_authenticated_app_context(auth_context)
        finally:
            if session.in_transaction():
                session.rollback()


def get_stream_auth_context(
    request: Request,
    session_factory: SessionFactory = Depends(get_db_session_factory),
    identity: AuthProviderIdentity = Depends(get_auth_provider_identity),
) -> AuthContext:
    return _load_stream_auth_context(
        request=request,
        session_factory=session_factory,
        identity=identity,
    )


def _load_snapshot(
    session_factory: SessionFactory, app_user_id: UUID
) -> dict[str, object]:
    """Synchronously load a notification snapshot using a short-lived session.

    Designed to be dispatched via ``run_in_threadpool`` so that blocking
    SQLAlchemy I/O does not execute on the async event loop. The session is
    opened and closed within this call — the returned dict contains only
    plain data and does not keep the session alive.
    """
    with session_factory() as session:
        try:
            return serialize_notification_snapshot(session, app_user_id=app_user_id)
        finally:
            if session.in_transaction():
                session.rollback()


@router.get("/me", response_model=PaginatedResponse[NotificationPayload])
def get_my_notifications(
    unread_only: bool = Query(default=False),
    pagination: PaginationParams = Depends(get_pagination_params),
    auth_context: AuthContext = Depends(get_auth_context),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[NotificationPayload]:
    return list_notifications_for_user(
        session,
        app_user_id=auth_context.app_user_id,
        pagination=pagination,
        unread_only=unread_only,
    )


@router.get("/stream")
async def stream_my_notifications(
    request: Request,
    auth_context: AuthContext = Depends(get_stream_auth_context),
    session_factory: SessionFactory = Depends(get_db_session_factory),
) -> StreamingResponse:
    subscriber_id = uuid4().hex
    subscriber_queue = notification_stream_broker.subscribe(
        app_user_id=auth_context.app_user_id,
        subscriber_id=subscriber_id,
    )

    async def take_snapshot() -> str | None:
        """Load a snapshot off the event loop, bounded by a timeout.

        Returns the framed SSE message on success, or ``None`` if the snapshot
        timed out. Timeouts are logged; the caller is expected to terminate
        the stream so the client reconnects cleanly rather than receiving a
        silently degraded stream.
        """
        try:
            with anyio.fail_after(STREAM_SNAPSHOT_TIMEOUT_SECONDS):
                snapshot = await run_in_threadpool(
                    _load_snapshot, session_factory, auth_context.app_user_id
                )
        except TimeoutError:
            logger.warning(
                "notification_stream_snapshot_timeout",
                extra={
                    "app_user_id": str(auth_context.app_user_id),
                    "subscriber_id": subscriber_id,
                    "timeout_seconds": STREAM_SNAPSHOT_TIMEOUT_SECONDS,
                },
            )
            return None
        except Exception:
            logger.exception(
                "notification_stream_snapshot_failed",
                extra={
                    "app_user_id": str(auth_context.app_user_id),
                    "subscriber_id": subscriber_id,
                },
            )
            return None
        return _format_snapshot_message(snapshot)

    async def event_stream():
        idle_seconds = 0
        try:
            initial = await take_snapshot()
            if initial is None:
                return
            yield initial

            while True:
                if await request.is_disconnected():
                    break

                delivered = False
                while True:
                    try:
                        stream_event = subscriber_queue.get_nowait()
                    except Empty:
                        break
                    delivered = True
                    yield build_sse_message(
                        event=stream_event.event, data=stream_event.payload
                    )

                if delivered:
                    idle_seconds = 0
                    continue

                idle_seconds += STREAM_POLL_INTERVAL_SECONDS
                if idle_seconds >= STREAM_RECONCILE_INTERVAL_SECONDS:
                    reconcile = await take_snapshot()
                    if reconcile is None:
                        break
                    yield reconcile
                    idle_seconds = 0
                else:
                    yield ": keep-alive\n\n"

                await anyio.sleep(STREAM_POLL_INTERVAL_SECONDS)
        finally:
            notification_stream_broker.unsubscribe(
                app_user_id=auth_context.app_user_id,
                subscriber_id=subscriber_id,
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.patch("/me/read-all", response_model=NotificationBulkReadResponse)
def patch_all_notifications_read(
    auth_context: AuthContext = Depends(get_auth_context),
    session: Session = Depends(get_db_session),
) -> NotificationBulkReadResponse:
    notifications = mark_all_notifications_read(
        session, app_user_id=auth_context.app_user_id
    )
    return NotificationBulkReadResponse(
        notifications=[
            serialize_notification_read_result(notification)
            for notification in notifications
        ],
        marked_count=len(notifications),
    )


@router.patch("/me/{notification_id}/read", response_model=NotificationReadResponse)
def patch_notification_read(
    notification_id: UUID,
    auth_context: AuthContext = Depends(get_auth_context),
    session: Session = Depends(get_db_session),
) -> NotificationReadResponse:
    notification = ensure_found(
        get_notification_for_user(
            session,
            notification_id=notification_id,
            app_user_id=auth_context.app_user_id,
        ),
        entity_name="Notification",
    )
    notification = mark_notification_read(session, notification=notification)
    return NotificationReadResponse(
        notification=serialize_notification_read_result(notification)
    )
