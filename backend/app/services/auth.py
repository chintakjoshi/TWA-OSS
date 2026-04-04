from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models import AppUser, Employer, Jobseeker, NotificationConfig
from app.models.enums import AppRole, EmployerReviewStatus
from app.schemas.auth import PortalScope
from app.services.jobseeker import is_jobseeker_profile_complete
from app.services.notifications import notify_staff_employer_pending_review


@dataclass(slots=True)
class AuthProviderIdentity:
    auth_user_id: UUID
    email: str
    auth_provider_role: str
    principal_type: Literal["user"] = "user"


@dataclass(slots=True)
class AuthMeResult:
    app_user: AppUser | None
    profile_complete: bool
    employer_review_status: str | None
    employer_capabilities: dict[str, bool] | None
    next_step: str | None


def get_auth_provider_identity(request: Request) -> AuthProviderIdentity:
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict):
        raise AppError(
            status_code=401, code="AUTH_REQUIRED", detail="Authentication is required."
        )
    if user.get("type") != "user":
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            detail="Only authenticated end users may access this resource.",
        )

    user_id = user.get("user_id")
    email = user.get("email")
    role = user.get("role")
    if (
        not isinstance(user_id, str)
        or not isinstance(email, str)
        or not isinstance(role, str)
    ):
        raise AppError(
            status_code=401,
            code="INVALID_IDENTITY",
            detail="Authenticated identity is missing required claims.",
        )

    try:
        auth_user_id = UUID(user_id)
    except ValueError as exc:
        raise AppError(
            status_code=401,
            code="INVALID_IDENTITY",
            detail="Authenticated identity has an invalid subject.",
        ) from exc

    return AuthProviderIdentity(
        auth_user_id=auth_user_id, email=email, auth_provider_role=role
    )


def resolve_auth_context(*, request: Request, session: Session, identity) -> object:
    cached = getattr(request.state, "auth_context", None)
    if cached is not None:
        return cached

    app_user = get_app_user_by_auth_user_id(session, identity.auth_user_id)

    from app.core.auth import AuthContext

    auth_context = AuthContext(
        auth_user_id=identity.auth_user_id,
        email=identity.email,
        auth_provider_role=identity.auth_provider_role,
        app_user_id=app_user.id if app_user else None,
        app_role=app_user.app_role.value if app_user and app_user.app_role else None,
        is_active=app_user.is_active if app_user else True,
    )
    request.state.auth_context = auth_context
    request.state.app_user = app_user
    return auth_context


def get_app_user_by_auth_user_id(
    session: Session, auth_user_id: UUID
) -> AppUser | None:
    statement = select(AppUser).where(AppUser.auth_user_id == auth_user_id)
    return session.execute(statement).scalar_one_or_none()


def bootstrap_user(
    *,
    session: Session,
    identity: AuthProviderIdentity,
    requested_role: Literal["jobseeker", "employer"],
    employer_profile: object | None,
) -> tuple[AppUser, str | None]:
    if identity.auth_provider_role != "user":
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            detail="Only end-user auth accounts may bootstrap a TWA role.",
        )

    app_user = get_app_user_by_auth_user_id(session, identity.auth_user_id)
    requested_app_role = AppRole(requested_role)

    if app_user is not None:
        existing_role = app_user.app_role.value if app_user.app_role else None
        if existing_role is not None and existing_role != requested_role:
            raise AppError(
                status_code=409,
                code="CONFLICT",
                detail="This account has already been bootstrapped with a different TWA role.",
            )
    else:
        app_user = AppUser(
            auth_user_id=identity.auth_user_id,
            email=identity.email,
            auth_provider_role=identity.auth_provider_role,
            app_role=requested_app_role,
            is_active=True,
        )
        session.add(app_user)
        session.flush()

    created_employer_profile = False

    if requested_role == "jobseeker":
        profile = session.execute(
            select(Jobseeker).where(Jobseeker.app_user_id == app_user.id)
        ).scalar_one_or_none()
        if profile is None:
            session.add(Jobseeker(app_user_id=app_user.id))
        next_step = "complete_jobseeker_profile"
    else:
        profile = session.execute(
            select(Employer).where(Employer.app_user_id == app_user.id)
        ).scalar_one_or_none()
        if profile is None:
            profile = Employer(
                app_user_id=app_user.id,
                org_name=employer_profile.org_name,
                contact_name=employer_profile.contact_name,
                phone=employer_profile.phone,
                address=employer_profile.address,
                city=employer_profile.city,
                zip=employer_profile.zip,
                review_status=EmployerReviewStatus.PENDING,
            )
            session.add(profile)
            created_employer_profile = True
        next_step = "await_staff_approval"

    session.commit()
    session.refresh(app_user)
    if created_employer_profile and isinstance(profile, Employer):
        notify_staff_employer_pending_review(session, employer=profile)
    return app_user, next_step


def build_auth_me(*, session: Session, identity: AuthProviderIdentity) -> AuthMeResult:
    app_user = get_app_user_by_auth_user_id(session, identity.auth_user_id)
    if app_user is None:
        next_step = "bootstrap_role" if identity.auth_provider_role == "user" else None
        return AuthMeResult(
            app_user=None,
            profile_complete=False,
            employer_review_status=None,
            employer_capabilities=None,
            next_step=next_step,
        )

    if not app_user.is_active:
        raise AppError(
            status_code=403, code="ACCOUNT_INACTIVE", detail="This account is inactive."
        )

    profile_complete = True
    employer_review_status = None
    employer_capabilities = None
    next_step = None

    if app_user.app_role == AppRole.JOBSEEKER:
        profile = session.execute(
            select(Jobseeker).where(Jobseeker.app_user_id == app_user.id)
        ).scalar_one_or_none()
        profile_complete = is_jobseeker_profile_complete(profile)
        next_step = None if profile_complete else "complete_jobseeker_profile"
    elif app_user.app_role == AppRole.EMPLOYER:
        employer = session.execute(
            select(Employer).where(Employer.app_user_id == app_user.id)
        ).scalar_one_or_none()
        employer_review_status = employer.review_status.value if employer else None
        config = session.get(NotificationConfig, 1)
        employer_capabilities = {
            "applicant_visibility_enabled": (
                config.share_applicants_with_employer if config is not None else False
            )
        }
        next_step = (
            None
            if employer_review_status == EmployerReviewStatus.APPROVED.value
            else "await_staff_approval"
        )

    return AuthMeResult(
        app_user=app_user,
        profile_complete=profile_complete,
        employer_review_status=employer_review_status,
        employer_capabilities=employer_capabilities,
        next_step=next_step,
    )


def enforce_portal_access(
    *,
    auth_me: AuthMeResult,
    portal: PortalScope | None,
) -> AuthMeResult:
    if portal is None:
        return auth_me

    if auth_me.app_user is None:
        if (
            portal in {"jobseeker", "employer"}
            and auth_me.next_step == "bootstrap_role"
        ):
            return auth_me
        raise AppError(
            status_code=403,
            code="PORTAL_ACCESS_DENIED",
            detail="This account is not authorized for this portal.",
        )

    if auth_me.app_user.app_role != AppRole(portal):
        raise AppError(
            status_code=403,
            code="PORTAL_ACCESS_DENIED",
            detail="This account is not authorized for this portal.",
        )

    return auth_me
