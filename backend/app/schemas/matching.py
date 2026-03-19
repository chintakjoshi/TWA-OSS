from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class MatchJobSummaryPayload(BaseModel):
    id: UUID
    title: str
    city: str | None


class MatchJobseekerSummaryPayload(BaseModel):
    id: UUID
    full_name: str | None
    city: str | None


class JobForJobseekerMatchItem(BaseModel):
    job: MatchJobSummaryPayload
    is_eligible: bool
    ineligibility_reasons: list[str]
    ineligibility_tag: str | None = None


class JobForJobseekerMatchResponse(BaseModel):
    items: list[JobForJobseekerMatchItem]


class JobseekerForListingMatchItem(BaseModel):
    jobseeker: MatchJobseekerSummaryPayload
    is_eligible: bool
    ineligibility_reasons: list[str]


class JobseekerForListingMatchResponse(BaseModel):
    items: list[JobseekerForListingMatchItem]
