from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PlacementSummaryRowPayload(BaseModel):
    month: datetime
    applications: int
    hires: int


class PlacementSummaryPayload(BaseModel):
    rows: list[PlacementSummaryRowPayload]
    ytd_applications: int
    ytd_hires: int
    ytd_employers: int


class AdminDashboardPayload(BaseModel):
    pending_employers: int
    pending_listings: int
    active_jobseekers: int
    open_applications: int
    open_listings: int
    placement_summary: PlacementSummaryPayload


class AuditLogPayload(BaseModel):
    id: UUID
    actor_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID | None
    old_value: dict | None
    new_value: dict | None
    timestamp: datetime
