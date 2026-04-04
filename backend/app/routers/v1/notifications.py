from __future__ import annotations

import json
from queue import Empty
from uuid import UUID, uuid4

import anyio
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_auth_context
from app.core.config import get_settings
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.notifications import (
    NotificationBulkReadResponse,
    NotificationPayload,
    NotificationReadResponse,
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

settings = get_settings()
router = APIRouter(
    prefix=f"{settings.api_v1_prefix}/notifications", tags=["notifications"]
)

STREAM_POLL_INTERVAL_SECONDS = 1
STREAM_RECONCILE_INTERVAL_SECONDS = 15


def build_sse_message(*, event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def build_snapshot_message(*, session: Session, app_user_id: UUID) -> str:
    # End the read transaction before yielding back into the long-lived SSE loop.
    session.expire_all()
    try:
        snapshot = serialize_notification_snapshot(session, app_user_id=app_user_id)
    finally:
        if session.in_transaction():
            session.rollback()
    return build_sse_message(event="snapshot", data=snapshot)


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
    auth_context: AuthContext = Depends(get_auth_context),
    session: Session = Depends(get_db_session),
) -> StreamingResponse:
    subscriber_id = uuid4().hex
    subscriber_queue = notification_stream_broker.subscribe(
        app_user_id=auth_context.app_user_id,
        subscriber_id=subscriber_id,
    )

    async def event_stream():
        idle_seconds = 0
        try:
            yield build_snapshot_message(
                session=session,
                app_user_id=auth_context.app_user_id,
            )

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
                    yield build_snapshot_message(
                        session=session,
                        app_user_id=auth_context.app_user_id,
                    )
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
