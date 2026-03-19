from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models import AuditLog


def build_audit_snapshot(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if hasattr(value, "__table__"):
        mapper = inspect(value.__class__)
        payload = {column.key: getattr(value, column.key) for column in mapper.columns}
        return jsonable_encoder(payload)
    if isinstance(value, dict):
        return jsonable_encoder(value)
    return jsonable_encoder(value)


def write_audit(
    session: Session,
    *,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    old_value: Any = None,
    new_value: Any = None,
) -> AuditLog:
    audit_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=build_audit_snapshot(old_value),
        new_value=build_audit_snapshot(new_value),
    )
    session.add(audit_entry)
    session.flush()
    return audit_entry
