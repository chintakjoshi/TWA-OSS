from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str


class PaginationMeta(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1)
    total_items: int = Field(default=0, ge=0)
    total_pages: int = Field(default=0, ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    meta: PaginationMeta
