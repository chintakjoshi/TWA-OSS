from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Employer, JobListing, Jobseeker
from app.models.enums import (
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
    TransitRequirement,
    TransitType,
)
from app.schemas.matching import (
    JobForJobseekerMatchItem,
    JobseekerForListingMatchItem,
    MatchJobseekerSummaryPayload,
    MatchJobSummaryPayload,
)
from app.services.common import ensure_found
from app.services.jobseeker import get_jobseeker_by_id, is_jobseeker_profile_complete
from app.services.transit import zip_to_job_distance_miles

CHARGE_REASON_RULES = [
    ("charge_sex_offense", "disq_sex_offense", "charge_sex_offense_disqualified"),
    ("charge_violent", "disq_violent", "charge_violent_disqualified"),
    ("charge_armed", "disq_armed", "charge_armed_disqualified"),
    ("charge_children", "disq_children", "charge_children_disqualified"),
    ("charge_drug", "disq_drug", "charge_drug_disqualified"),
    ("charge_theft", "disq_theft", "charge_theft_disqualified"),
]
DISTANCE_UNAVAILABLE_NOTE = "Unable to provide distance for this listing right now."


@dataclass(slots=True)
class EligibilityResult:
    is_eligible: bool
    ineligibility_reasons: list[str]
    distance_miles: float | None = None
    ineligibility_tag: str | None = None
    eligibility_note: str | None = None


def charges_overlap(jobseeker: Jobseeker, listing: JobListing) -> list[str]:
    reasons: list[str] = []
    for jobseeker_attr, listing_attr, reason in CHARGE_REASON_RULES:
        if bool(getattr(jobseeker, jobseeker_attr)) and bool(
            getattr(listing, listing_attr)
        ):
            reasons.append(reason)
    return reasons


def check_transit_compat(jobseeker: Jobseeker, listing: JobListing) -> list[str]:
    reasons: list[str] = []
    if jobseeker.transit_type == TransitType.PUBLIC_TRANSIT:
        if listing.transit_required == TransitRequirement.OWN_CAR:
            reasons.append("requires_own_car")
        if listing.transit_accessible is False:
            reasons.append("transit_unreachable")
    return reasons


def build_jobseeker_eligibility_note(listing: JobListing) -> str | None:
    if listing.transit_accessible is None:
        return DISTANCE_UNAVAILABLE_NOTE
    return None


def build_jobseeker_ineligibility_tag(
    reasons: list[str], *, distance_miles: float | None
) -> str | None:
    if not reasons:
        return None
    if not any(reason == "transit_unreachable" for reason in reasons):
        return None
    if distance_miles is None:
        return None
    return f"{distance_miles:.1f} miles from your zip code"


def build_jobseeker_distance_miles(
    jobseeker: Jobseeker, listing: JobListing
) -> float | None:
    return zip_to_job_distance_miles(
        jobseeker.zip, job_lat=listing.job_lat, job_lon=listing.job_lon
    )


def evaluate_jobseeker_listing_match(
    jobseeker: Jobseeker, listing: JobListing
) -> EligibilityResult:
    reasons: list[str] = []
    if not is_jobseeker_profile_complete(jobseeker):
        reasons.append("profile_incomplete")
    reasons.extend(charges_overlap(jobseeker, listing))
    reasons.extend(check_transit_compat(jobseeker, listing))
    unique_reasons = list(dict.fromkeys(reasons))
    distance_miles = build_jobseeker_distance_miles(jobseeker, listing)
    return EligibilityResult(
        is_eligible=len(unique_reasons) == 0,
        ineligibility_reasons=unique_reasons,
        distance_miles=distance_miles,
        ineligibility_tag=build_jobseeker_ineligibility_tag(
            unique_reasons, distance_miles=distance_miles
        ),
        eligibility_note=build_jobseeker_eligibility_note(listing),
    )


def get_eligible_jobs_for_jobseeker(
    session: Session, jobseeker_id: UUID
) -> list[JobForJobseekerMatchItem]:
    jobseeker = ensure_found(
        get_jobseeker_by_id(session, jobseeker_id), entity_name="Jobseeker"
    )
    statement = (
        select(JobListing)
        .join(JobListing.employer)
        .options(joinedload(JobListing.employer).joinedload(Employer.app_user))
        .where(
            Employer.review_status.in_(
                (
                    EmployerReviewStatus.PENDING,
                    EmployerReviewStatus.APPROVED,
                )
            ),
            JobListing.review_status == ListingReviewStatus.APPROVED,
            JobListing.lifecycle_status == ListingLifecycleStatus.OPEN,
        )
        .order_by(JobListing.created_at.desc())
    )
    listings = session.execute(statement).unique().scalars().all()
    return [
        JobForJobseekerMatchItem(
            job=MatchJobSummaryPayload(
                id=listing.id, title=listing.title, city=listing.city
            ),
            is_eligible=(
                result := evaluate_jobseeker_listing_match(jobseeker, listing)
            ).is_eligible,
            ineligibility_reasons=result.ineligibility_reasons,
            ineligibility_tag=result.ineligibility_tag,
        )
        for listing in listings
    ]


def get_eligible_jobseekers_for_job(
    session: Session, job_listing_id: UUID
) -> list[JobseekerForListingMatchItem]:
    listing_statement = (
        select(JobListing)
        .options(joinedload(JobListing.employer).joinedload(Employer.app_user))
        .where(JobListing.id == job_listing_id)
    )
    listing = ensure_found(
        session.execute(listing_statement).unique().scalar_one_or_none(),
        entity_name="Job listing",
    )
    jobseeker_statement = (
        select(Jobseeker)
        .options(joinedload(Jobseeker.app_user))
        .where(Jobseeker.status == JobseekerStatus.ACTIVE)
        .order_by(Jobseeker.created_at.desc())
    )
    jobseekers = session.execute(jobseeker_statement).unique().scalars().all()
    return [
        JobseekerForListingMatchItem(
            jobseeker=MatchJobseekerSummaryPayload(
                id=jobseeker.id, full_name=jobseeker.full_name, city=jobseeker.city
            ),
            is_eligible=(
                result := evaluate_jobseeker_listing_match(jobseeker, listing)
            ).is_eligible,
            ineligibility_reasons=result.ineligibility_reasons,
        )
        for jobseeker in jobseekers
    ]
