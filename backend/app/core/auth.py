from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.db.session import get_db_session
from app.models import Employer
from app.models.enums import EmployerReviewStatus
from app.services.auth import (
    AuthProviderIdentity,
    get_auth_provider_identity,
    resolve_auth_context,
)
from app.services.jobseeker import (
    get_jobseeker_by_app_user_id,
    is_jobseeker_profile_complete,
)

AppRole = Literal["jobseeker", "employer", "staff"]


@dataclass(slots=True)
class AuthContext:
    auth_user_id: UUID
    email: str
    auth_provider_role: str
    app_user_id: UUID | None = None
    app_role: AppRole | None = None
    is_active: bool = True


def get_optional_auth_context(request: Request) -> AuthContext | None:
    return getattr(request.state, "auth_context", None)


def get_auth_context(
    request: Request,
    session: Session = Depends(get_db_session),
    identity: AuthProviderIdentity = Depends(get_auth_provider_identity),
) -> AuthContext:
    auth_context = resolve_auth_context(
        request=request, session=session, identity=identity
    )
    if auth_context.app_user_id is None or auth_context.app_role is None:
        raise AppError(
            status_code=403,
            code="BOOTSTRAP_REQUIRED",
            detail="This account must complete local TWA bootstrap before using this resource.",
        )
    if not auth_context.is_active:
        raise AppError(
            status_code=403, code="ACCOUNT_INACTIVE", detail="This account is inactive."
        )
    return auth_context


def require_role(*allowed_roles: AppRole):
    def dependency(
        auth_context: AuthContext = Depends(get_auth_context),
    ) -> AuthContext:
        if auth_context.app_role not in allowed_roles:
            raise AppError(
                status_code=403,
                code="FORBIDDEN",
                detail="You do not have access to this resource.",
            )
        return auth_context

    return dependency


def require_jobseeker(
    auth_context: AuthContext = Depends(require_role("jobseeker")),
) -> AuthContext:
    return auth_context


def require_completed_jobseeker(
    auth_context: AuthContext = Depends(require_jobseeker),
    session: Session = Depends(get_db_session),
) -> AuthContext:
    jobseeker = get_jobseeker_by_app_user_id(session, auth_context.app_user_id)
    if not is_jobseeker_profile_complete(jobseeker):
        raise AppError(
            status_code=403,
            code="PROFILE_INCOMPLETE",
            detail="This jobseeker profile must be completed before using this resource.",
        )
    return auth_context


def require_employer(
    auth_context: AuthContext = Depends(require_role("employer")),
) -> AuthContext:
    return auth_context


def require_staff(
    auth_context: AuthContext = Depends(require_role("staff")),
) -> AuthContext:
    return auth_context


def require_approved_employer(
    auth_context: AuthContext = Depends(require_employer),
    session: Session = Depends(get_db_session),
) -> AuthContext:
    employer = session.execute(
        select(Employer).where(Employer.app_user_id == auth_context.app_user_id)
    ).scalar_one_or_none()
    if employer is None:
        raise AppError(
            status_code=403,
            code="EMPLOYER_PROFILE_REQUIRED",
            detail="This employer account does not have a local employer profile.",
        )
    if employer.review_status != EmployerReviewStatus.APPROVED:
        raise AppError(
            status_code=403,
            code="EMPLOYER_REVIEW_PENDING",
            detail="This employer account is not approved for employer features yet.",
        )
    return auth_context
