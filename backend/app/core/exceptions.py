from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import log_exception


class AppError(Exception):
    def __init__(self, *, status_code: int, code: str, detail: str) -> None:
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        error = {"code": exc.code, "message": exc.detail}
        request_id = getattr(request.state, "request_id", None)
        if request_id is not None:
            error["request_id"] = request_id
        return JSONResponse(status_code=exc.status_code, content={"error": error})

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        error = {
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed.",
            "details": jsonable_encoder(exc.errors()),
        }
        request_id = getattr(request.state, "request_id", None)
        if request_id is not None:
            error["request_id"] = request_id
        return JSONResponse(status_code=422, content={"error": error})

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
        error = {"code": "HTTP_ERROR", "message": detail}
        request_id = getattr(request.state, "request_id", None)
        if request_id is not None:
            error["request_id"] = request_id
        return JSONResponse(status_code=exc.status_code, content={"error": error})

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        log_exception(request=request, exc=exc)
        error = {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
        }
        request_id = getattr(request.state, "request_id", None)
        if request_id is not None:
            error["request_id"] = request_id
        return JSONResponse(status_code=500, content={"error": error})
