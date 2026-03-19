from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import RequestLoggingMiddleware, configure_logging
from app.core.middleware import PathAwareJWTAuthMiddleware
from app.routers import router as api_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        swagger_ui_parameters={"persistAuthorization": True},
    )

    if settings.cors_origins_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    if settings.auth_enabled:
        app.add_middleware(
            PathAwareJWTAuthMiddleware,
            auth_base_url=settings.auth_base_url,
            expected_audience=settings.twa_auth_audience,
            public_exact_paths={
                "/health",
                settings.api_v1_prefix,
                f"{settings.api_v1_prefix}/health",
                "/openapi.json",
            },
            public_path_prefixes=("/docs", "/redoc"),
        )

    app.add_middleware(
        RequestLoggingMiddleware, request_id_header=settings.request_id_header
    )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
