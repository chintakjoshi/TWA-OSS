from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, Request

from app.core.exceptions import AppError

AppRole = Literal["jobseeker", "employer", "staff"]


@dataclass(slots=True)
class AuthContext:
    auth_user_id: str
    app_user_id: str | None = None
    app_role: AppRole | None = None
    is_active: bool = True


def get_optional_auth_context(request: Request) -> AuthContext | None:
    return getattr(request.state, "auth_context", None)


def get_auth_context(request: Request) -> AuthContext:
    auth_context = get_optional_auth_context(request)
    if auth_context is None:
        raise AppError(status_code=401, code="AUTH_REQUIRED", detail="Authentication is required.")
    if not auth_context.is_active:
        raise AppError(status_code=403, code="ACCOUNT_INACTIVE", detail="This account is inactive.")
    return auth_context


def require_role(*allowed_roles: AppRole):
    def dependency(auth_context: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if auth_context.app_role not in allowed_roles:
            raise AppError(status_code=403, code="FORBIDDEN", detail="You do not have access to this resource.")
        return auth_context

    return dependency
