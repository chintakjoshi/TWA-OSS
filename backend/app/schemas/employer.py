from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChargeFlagsPayload(BaseModel):
    sex_offense: bool = False
    violent: bool = False
    armed: bool = False
    children: bool = False
    drug: bool = False
    theft: bool = False


class EmployerProfilePayload(BaseModel):
    id: UUID
    app_user_id: UUID
    auth_user_id: UUID
    org_name: str
    contact_name: str | None
    phone: str | None
    address: str | None
    city: str | None
    zip: str | None
    review_status: Literal["pending", "approved", "rejected"]
    review_note: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class EmployerProfileResponse(BaseModel):
    employer: EmployerProfilePayload


class EmployerProfileUpdateRequest(BaseModel):
    org_name: str | None = Field(default=None, min_length=1, max_length=255)
    contact_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=128)
    zip: str | None = Field(default=None, max_length=16)


class JobListingPayload(BaseModel):
    id: UUID
    employer_id: UUID
    title: str
    description: str | None
    location_address: str | None
    city: str | None
    zip: str | None
    transit_required: Literal["own_car", "any"]
    disqualifying_charges: ChargeFlagsPayload
    transit_accessible: bool | None
    job_lat: float | None
    job_lon: float | None
    review_status: Literal["pending", "approved", "rejected"]
    lifecycle_status: Literal["open", "closed"]
    review_note: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class JobListingResponse(BaseModel):
    listing: JobListingPayload


class JobListingListItemPayload(JobListingPayload):
    employer: EmployerProfilePayload | None = None


class CreateJobListingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    location_address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=128)
    zip: str | None = Field(default=None, max_length=16)
    transit_required: Literal["own_car", "any"] = "any"
    disqualifying_charges: ChargeFlagsPayload = Field(default_factory=ChargeFlagsPayload)
    transit_accessible: bool | None = None
    job_lat: float | None = None
    job_lon: float | None = None


class UpdateEmployerReviewRequest(BaseModel):
    review_status: Literal["pending", "approved", "rejected"]
    review_note: str | None = None


class UpdateEmployerReviewResponse(BaseModel):
    employer: EmployerProfilePayload


class UpdateListingReviewRequest(BaseModel):
    review_status: Literal["pending", "approved", "rejected"] | None = None
    lifecycle_status: Literal["open", "closed"] | None = None
    review_note: str | None = None


class UpdateListingReviewResponse(BaseModel):
    listing: JobListingPayload
