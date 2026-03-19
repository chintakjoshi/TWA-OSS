from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin

json_type = JSON().with_variant(JSONB, "postgresql")


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_log_actor_id", "actor_id"),
        Index("ix_audit_log_entity_type", "entity_type"),
        Index("ix_audit_log_entity_id", "entity_id"),
        Index("ix_audit_log_timestamp", "timestamp"),
    )

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID | None]
    old_value: Mapped[dict | None] = mapped_column(json_type)
    new_value: Mapped[dict | None] = mapped_column(json_type)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
