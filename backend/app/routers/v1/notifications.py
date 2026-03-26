from __future__ import annotations

import json
from queue import Empty
from uuid import UUID
from uuid import uuid4

import anyio
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_auth_context
from app.core.config import get_settings
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.notifications import NotificationPayload, NotificationReadResponse
from app.services.common import PaginationParams, ensure_found, get_pagination_params
from app.services.notifications import (
    get_notification_for_user,
    notification_stream_broker,
    list_notifications_for_user,
    mark_notification_read,
    serialize_notification_snapshot,
    serialize_notification_read_result,
)

settings = get_settings()
router = APIRouter(
    prefix=f"{settings.api_v1_prefix}/notifications", tags=["notifications"]
)

STREAM_POLL_INTERVAL_SECONDS = 1
STREAM_RECONCILE_INTERVAL_SECONDS = 15


def build_sse_message(*, event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


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
            session.expire_all()
            yield build_sse_message(
                event="snapshot",
                data=serialize_notification_snapshot(
                    session, app_user_id=auth_context.app_user_id
                ),
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
                    session.expire_all()
                    yield build_sse_message(
                        event="snapshot",
                        data=serialize_notification_snapshot(
                            session, app_user_id=auth_context.app_user_id
                        ),
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
