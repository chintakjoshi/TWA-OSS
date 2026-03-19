from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, TypeVar

from fastapi import Query

from app.core.exceptions import AppError
from app.core.responses import PaginatedResponse, PaginationMeta

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
T = TypeVar("T")


@dataclass(slots=True)
class PaginationParams:
    page: int = 1
    page_size: int = DEFAULT_PAGE_SIZE

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


@dataclass(slots=True)
class SortParams:
    sort_by: str | None = None
    direction: str = "asc"


def get_pagination_params(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


def get_sort_params(
    sort: str | None = Query(default=None),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
) -> SortParams:
    return SortParams(sort_by=sort, direction=order)


def apply_pagination(statement, pagination: PaginationParams):
    return statement.offset(pagination.offset).limit(pagination.page_size)


def apply_filters(
    statement, *, filters: dict[str, Any], allowed_filters: dict[str, Any]
):
    for field_name, value in filters.items():
        if value is None:
            continue
        column = allowed_filters.get(field_name)
        if column is None:
            raise AppError(
                status_code=422,
                code="INVALID_FILTER",
                detail=f"Unsupported filter field: {field_name}.",
            )
        statement = statement.where(column == value)
    return statement


def apply_sorting(statement, *, sort: SortParams, allowed_sorts: dict[str, Any]):
    if sort.sort_by is None:
        return statement

    column = allowed_sorts.get(sort.sort_by)
    if column is None:
        raise AppError(
            status_code=422,
            code="INVALID_SORT",
            detail=f"Unsupported sort field: {sort.sort_by}.",
        )

    if sort.direction == "desc":
        return statement.order_by(column.desc())
    return statement.order_by(column.asc())


def build_paginated_response(
    *, items: list[T], total_items: int, pagination: PaginationParams
) -> PaginatedResponse[T]:
    total_pages = math.ceil(total_items / pagination.page_size) if total_items else 0
    return PaginatedResponse(
        items=items,
        meta=PaginationMeta(
            page=pagination.page,
            page_size=pagination.page_size,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


def ensure_found(instance: T | None, *, entity_name: str = "Resource") -> T:
    if instance is None:
        raise AppError(
            status_code=404, code="NOT_FOUND", detail=f"{entity_name} was not found."
        )
    return instance


def ensure_permission(
    is_allowed: bool,
    *,
    detail: str = "You do not have access to this resource.",
    code: str = "FORBIDDEN",
) -> None:
    if not is_allowed:
        raise AppError(status_code=403, code=code, detail=detail)
