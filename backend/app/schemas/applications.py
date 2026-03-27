from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.employer import JobListingPayload


class JobWithEligibilityPayload(BaseModel):
    job: JobListingPayload
    is_eligible: bool
    ineligibility_tag: str | None
    has_applied: bool = False


class JobEligibilityPayload(BaseModel):
    is_eligible: bool
    ineligibility_tag: str | None
    has_applied: bool = False


class JobDetailResponse(BaseModel):
    job: JobListingPayload
    eligibility: JobEligibilityPayload


class CreateApplicationRequest(BaseModel):
    job_listing_id: UUID


class ApplicationPayload(BaseModel):
    id: UUID
    jobseeker_id: UUID
    job_listing_id: UUID
    status: Literal["submitted", "reviewed", "hired"]
    applied_at: datetime
    updated_at: datetime | None


class ApplicationResponse(BaseModel):
    application: ApplicationPayload


class ApplicationJobSummaryPayload(BaseModel):
    id: UUID
    title: str
    city: str | None
    lifecycle_status: Literal["open", "closed"]


class MyApplicationListItemPayload(BaseModel):
    id: UUID
    status: Literal["submitted", "reviewed", "hired"]
    applied_at: datetime
    updated_at: datetime | None
    job: ApplicationJobSummaryPayload


class AdminApplicationJobseekerSummaryPayload(BaseModel):
    id: UUID
    full_name: str | None


class AdminApplicationJobSummaryPayload(BaseModel):
    id: UUID
    title: str


class AdminApplicationListItemPayload(BaseModel):
    id: UUID
    status: Literal["submitted", "reviewed", "hired"]
    applied_at: datetime
    updated_at: datetime | None
    jobseeker: AdminApplicationJobseekerSummaryPayload
    job: AdminApplicationJobSummaryPayload


class UpdateApplicationStatusRequest(BaseModel):
    status: Literal["submitted", "reviewed", "hired"]
    close_listing_after_hire: bool = Field(default=False)


class UpdateApplicationStatusResultPayload(BaseModel):
    id: UUID
    status: Literal["submitted", "reviewed", "hired"]
    updated_at: datetime | None


class UpdateApplicationStatusResponse(BaseModel):
    application: UpdateApplicationStatusResultPayload
