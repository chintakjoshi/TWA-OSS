from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import RequestLoggingMiddleware, configure_logging
from app.core.middleware import CookieCSRFMiddleware, PathAwareJWTAuthMiddleware
from app.routers import router as api_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )

    if settings.auth_enabled:
        app.add_middleware(
            CookieCSRFMiddleware,
            csrf_cookie_name=settings.auth_csrf_cookie_name,
            csrf_header_name=settings.auth_csrf_header_name,
        )
        public_exact_paths = {
            "/health",
            settings.api_v1_prefix,
            f"{settings.api_v1_prefix}/health",
        }
        public_path_prefixes: tuple[str, ...] = ()
        if settings.docs_enabled:
            public_exact_paths.add("/openapi.json")
            public_path_prefixes = ("/docs", "/redoc")
        app.add_middleware(
            PathAwareJWTAuthMiddleware,
            auth_base_url=settings.auth_base_url,
            expected_audience=settings.twa_auth_audience,
            token_sources=["authorization", "cookie"],
            access_cookie_name=settings.auth_access_cookie_name,
            public_exact_paths=public_exact_paths,
            public_path_prefixes=public_path_prefixes,
        )

    app.add_middleware(
        RequestLoggingMiddleware, request_id_header=settings.request_id_header
    )
    if settings.cors_origins_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
