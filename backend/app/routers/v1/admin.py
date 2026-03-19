from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_staff
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.models import AppUser
from app.schemas.employer import (
    EmployerProfilePayload,
    JobListingListItemPayload,
    UpdateEmployerReviewRequest,
    UpdateEmployerReviewResponse,
    UpdateListingReviewRequest,
    UpdateListingReviewResponse,
)
from app.services.common import PaginationParams, SortParams, ensure_found, get_pagination_params, get_sort_params
from app.services.employer import (
    get_employer_by_id,
    get_listing_by_id,
    list_employers,
    list_listings,
    review_employer,
    review_listing,
    serialize_employer,
    serialize_listing,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/queue/employers", response_model=PaginatedResponse[EmployerProfilePayload])
def get_pending_employer_queue(
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerProfilePayload]:
    return list_employers(session, pagination=pagination, sort=sort, pending_only=True)


@router.get("/employers", response_model=PaginatedResponse[EmployerProfilePayload])
def get_all_employers(
    review_status: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerProfilePayload]:
    return list_employers(session, pagination=pagination, sort=sort, review_status=review_status)


@router.patch("/employers/{employer_id}", response_model=UpdateEmployerReviewResponse)
def patch_employer_review(
    employer_id: UUID,
    payload: UpdateEmployerReviewRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> UpdateEmployerReviewResponse:
    employer = ensure_found(get_employer_by_id(session, employer_id), entity_name="Employer")
    reviewer = ensure_found(session.get(AppUser, auth_context.app_user_id), entity_name="Staff user")
    employer = review_employer(
        session,
        employer=employer,
        reviewer=reviewer,
        review_status=payload.review_status,
        review_note=payload.review_note,
    )
    return UpdateEmployerReviewResponse(employer=serialize_employer(employer))


@router.get("/queue/listings", response_model=PaginatedResponse[JobListingListItemPayload])
def get_pending_listing_queue(
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobListingListItemPayload]:
    return list_listings(session, pagination=pagination, sort=sort, pending_only=True)


@router.get("/listings", response_model=PaginatedResponse[JobListingListItemPayload])
def get_all_listings(
    review_status: str | None = Query(default=None),
    lifecycle_status: str | None = Query(default=None),
    employer_id: UUID | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobListingListItemPayload]:
    return list_listings(
        session,
        pagination=pagination,
        sort=sort,
        review_status=review_status,
        lifecycle_status=lifecycle_status,
        employer_id=employer_id,
    )


@router.patch("/listings/{listing_id}", response_model=UpdateListingReviewResponse)
def patch_listing_review(
    listing_id: UUID,
    payload: UpdateListingReviewRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> UpdateListingReviewResponse:
    listing = ensure_found(get_listing_by_id(session, listing_id), entity_name="Job listing")
    reviewer = ensure_found(session.get(AppUser, auth_context.app_user_id), entity_name="Staff user")
    listing = review_listing(
        session,
        listing=listing,
        reviewer=reviewer,
        review_status=payload.review_status,
        lifecycle_status=payload.lifecycle_status,
        review_note=payload.review_note,
    )
    return UpdateListingReviewResponse(listing=serialize_listing(listing))
