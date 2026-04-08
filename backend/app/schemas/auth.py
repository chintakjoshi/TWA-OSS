from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.normalization import (
    NormalizedOptionalSingleLineText,
    NormalizedOptionalUsZipCode,
    NormalizedRequiredSingleLineText,
)

PortalScope = Literal["jobseeker", "employer", "staff"]


class EmployerBootstrapProfile(BaseModel):
    org_name: NormalizedRequiredSingleLineText = Field(min_length=1, max_length=255)
    contact_name: NormalizedOptionalSingleLineText = Field(
        default=None, max_length=255
    )
    phone: NormalizedOptionalSingleLineText = Field(default=None, max_length=32)
    address: NormalizedOptionalSingleLineText = Field(default=None, max_length=255)
    city: NormalizedOptionalSingleLineText = Field(default=None, max_length=128)
    zip: NormalizedOptionalUsZipCode = Field(default=None, max_length=16)


class AuthBootstrapRequest(BaseModel):
    role: Literal["jobseeker", "employer"]
    employer_profile: EmployerBootstrapProfile | None = None

    @model_validator(mode="after")
    def validate_role_payload(self) -> "AuthBootstrapRequest":
        if self.role == "employer" and self.employer_profile is None:
            raise ValueError("employer_profile is required when role is employer.")
        if self.role == "jobseeker" and self.employer_profile is not None:
            raise ValueError("employer_profile is not allowed when role is jobseeker.")
        return self


class AppUserPayload(BaseModel):
    id: UUID
    auth_user_id: UUID
    email: str
    auth_provider_role: str
    app_role: Literal["jobseeker", "employer", "staff"] | None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AuthBootstrapResponse(BaseModel):
    app_user: AppUserPayload
    next_step: str | None


class EmployerCapabilitiesPayload(BaseModel):
    applicant_visibility_enabled: bool


class AuthMeResponse(BaseModel):
    app_user: AppUserPayload | None
    profile_complete: bool
    employer_review_status: Literal["pending", "approved", "rejected"] | None
    employer_capabilities: EmployerCapabilitiesPayload | None = None
    next_step: str | None
