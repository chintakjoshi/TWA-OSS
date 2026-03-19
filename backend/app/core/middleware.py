from __future__ import annotations

from sdk import JWTAuthMiddleware
from starlette.requests import Request
from starlette.responses import Response


class PathAwareJWTAuthMiddleware(JWTAuthMiddleware):
    def __init__(
        self,
        app,
        *,
        auth_base_url: str,
        expected_audience: str | list[str],
        public_exact_paths: set[str] | None = None,
        public_path_prefixes: tuple[str, ...] | None = None,
    ) -> None:
        self._public_exact_paths = public_exact_paths or set()
        self._public_path_prefixes = public_path_prefixes or tuple()
        super().__init__(
            app,
            auth_base_url=auth_base_url,
            expected_audience=expected_audience,
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path.rstrip("/") or "/"
        if path in self._public_exact_paths:
            return await call_next(request)
        if any(path.startswith(prefix) for prefix in self._public_path_prefixes):
            return await call_next(request)
        return await super().dispatch(request, call_next)