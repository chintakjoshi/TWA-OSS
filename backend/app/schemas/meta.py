from pydantic import BaseModel


class ApiVersionResponse(BaseModel):
    service: str
    version: str
    docs_url: str
    openapi_url: str
