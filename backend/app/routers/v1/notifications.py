from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_auth_context
from app.core.config import get_settings
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.notifications import NotificationPayload, NotificationReadResponse
from app.services.common import PaginationParams, ensure_found, get_pagination_params
from app.services.notifications import (
    get_notification_for_user,
    list_notifications_for_user,
    mark_notification_read,
    serialize_notification_read_result,
)

settings = get_settings()
router = APIRouter(prefix=f"{settings.api_v1_prefix}/notifications", tags=["notifications"])


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


@router.patch("/me/{notification_id}/read", response_model=NotificationReadResponse)
def patch_notification_read(
    notification_id: UUID,
    auth_context: AuthContext = Depends(get_auth_context),
    session: Session = Depends(get_db_session),
) -> NotificationReadResponse:
    notification = ensure_found(
        get_notification_for_user(session, notification_id=notification_id, app_user_id=auth_context.app_user_id),
        entity_name="Notification",
    )
    notification = mark_notification_read(session, notification=notification)
    return NotificationReadResponse(notification=serialize_notification_read_result(notification))
