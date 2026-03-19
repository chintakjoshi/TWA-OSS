from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.employer import ChargeFlagsPayload


class JobseekerProfilePayload(BaseModel):
    id: UUID
    app_user_id: UUID
    auth_user_id: UUID
    full_name: str | None
    phone: str | None
    address: str | None
    city: str | None
    zip: str | None
    transit_type: Literal["own_car", "public_transit", "both"] | None
    charges: ChargeFlagsPayload
    profile_complete: bool
    status: Literal["active", "hired"]
    created_at: datetime | None
    updated_at: datetime | None


class JobseekerProfileResponse(BaseModel):
    profile: JobseekerProfilePayload


class JobseekerProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=128)
    zip: str | None = Field(default=None, max_length=16)
    transit_type: Literal["own_car", "public_transit", "both"] | None = None
    charges: ChargeFlagsPayload | None = None


class JobseekerProfileUpdateResultPayload(BaseModel):
    id: UUID
    profile_complete: bool
    updated_at: datetime | None


class JobseekerProfileUpdateResponse(BaseModel):
    profile: JobseekerProfileUpdateResultPayload


class JobseekerListItemPayload(BaseModel):
    id: UUID
    full_name: str | None
    city: str | None
    zip: str | None
    transit_type: Literal["own_car", "public_transit", "both"] | None
    status: Literal["active", "hired"]


class JobseekerApplicationSummaryPayload(BaseModel):
    id: UUID
    status: Literal["submitted", "reviewed", "hired"]
    job_listing_id: UUID


class AdminJobseekerDetailResponse(BaseModel):
    jobseeker: JobseekerProfilePayload
    applications: list[JobseekerApplicationSummaryPayload]


class AdminJobseekerUpdateRequest(JobseekerProfileUpdateRequest):
    status: Literal["active", "hired"] | None = None


class AdminJobseekerUpdateResponse(BaseModel):
    jobseeker: JobseekerProfileUpdateResultPayload
