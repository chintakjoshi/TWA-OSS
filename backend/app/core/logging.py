from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

RequestHandler = Callable[[Request], Response]


def configure_logging(level: str) -> None:
    resolved_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=resolved_level, format="%(message)s", force=True)


def _log_payload(*, level: str, logger: str, event: str, **fields: Any) -> str:
    return json.dumps(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "logger": logger,
            "event": event,
            **fields,
        },
        default=str,
    )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, request_id_header: str = "X-Request-ID") -> None:
        super().__init__(app)
        self.request_id_header = request_id_header
        self.logger = logging.getLogger("twa.http")

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get(self.request_id_header) or str(uuid.uuid4())
        request.state.request_id = request_id
        started_at = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers[self.request_id_header] = request_id
        self.logger.info(
            _log_payload(
                level="INFO",
                logger="twa.http",
                event="http_request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                query=str(request.url.query),
                status_code=response.status_code,
                duration_ms=duration_ms,
                client_ip=request.client.host if request.client else None,
            )
        )
        return response


def log_exception(*, request: Request, exc: Exception, logger_name: str = "twa.errors") -> None:
    logger = logging.getLogger(logger_name)
    logger.exception(
        _log_payload(
            level="ERROR",
            logger=logger_name,
            event="unhandled_exception",
            request_id=getattr(request.state, "request_id", None),
            method=request.method,
            path=request.url.path,
            exc_type=type(exc).__name__,
        )
    )
