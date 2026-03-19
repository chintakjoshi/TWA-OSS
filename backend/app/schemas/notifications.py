from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationConfigPayload(BaseModel):
    notify_staff_on_apply: bool
    notify_employer_on_apply: bool
    share_applicants_with_employer: bool
    updated_by: UUID | None
    updated_at: datetime | None


class NotificationConfigResponse(BaseModel):
    config: NotificationConfigPayload


class NotificationConfigUpdateRequest(BaseModel):
    notify_staff_on_apply: bool | None = None
    notify_employer_on_apply: bool | None = None
    share_applicants_with_employer: bool | None = None

    def has_updates(self) -> bool:
        return any(
            value is not None
            for value in (
                self.notify_staff_on_apply,
                self.notify_employer_on_apply,
                self.share_applicants_with_employer,
            )
        )


class NotificationPayload(BaseModel):
    id: UUID
    type: str
    channel: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime


class NotificationReadResultPayload(BaseModel):
    id: UUID
    read_at: datetime | None


class NotificationReadResponse(BaseModel):
    notification: NotificationReadResultPayload
