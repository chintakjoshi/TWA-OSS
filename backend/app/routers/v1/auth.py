from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.auth import AppUserPayload, AuthBootstrapRequest, AuthBootstrapResponse, AuthMeResponse
from app.services.auth import AuthProviderIdentity, bootstrap_user, build_auth_me, get_auth_provider_identity

from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])


@router.post("/bootstrap", response_model=AuthBootstrapResponse)
def bootstrap_auth_user(
    payload: AuthBootstrapRequest,
    session: Session = Depends(get_db_session),
    identity: AuthProviderIdentity = Depends(get_auth_provider_identity),
) -> AuthBootstrapResponse:
    app_user, next_step = bootstrap_user(
        session=session,
        identity=identity,
        requested_role=payload.role,
        employer_profile=payload.employer_profile,
    )
    return AuthBootstrapResponse(
        app_user=AppUserPayload.model_validate(app_user, from_attributes=True),
        next_step=next_step,
    )


@router.get("/me", response_model=AuthMeResponse)
def get_auth_me(
    session: Session = Depends(get_db_session),
    identity: AuthProviderIdentity = Depends(get_auth_provider_identity),
) -> AuthMeResponse:
    result = build_auth_me(session=session, identity=identity)
    return AuthMeResponse(
        app_user=AppUserPayload.model_validate(result.app_user, from_attributes=True) if result.app_user else None,
        profile_complete=result.profile_complete,
        employer_review_status=result.employer_review_status,
        next_step=result.next_step,
    )