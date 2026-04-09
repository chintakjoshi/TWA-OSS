from pydantic import BaseModel


class ApiVersionResponse(BaseModel):
    service: str
    version: str
    docs_url: str | None
    openapi_url: str | None
