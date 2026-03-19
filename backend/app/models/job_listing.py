from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ListingLifecycleStatus, ListingReviewStatus, TransitRequirement, enum_type
from app.models.mixins import DisqualifyingChargeFlagsMixin, TimestampMixin, UUIDPrimaryKeyMixin


class JobListing(UUIDPrimaryKeyMixin, TimestampMixin, DisqualifyingChargeFlagsMixin, Base):
    __tablename__ = "job_listings"
    __table_args__ = (
        Index("ix_job_listings_review_status", "review_status"),
        Index("ix_job_listings_lifecycle_status", "lifecycle_status"),
        Index("ix_job_listings_employer_id", "employer_id"),
        Index("ix_job_listings_city", "city"),
        Index("ix_job_listings_zip", "zip"),
    )

    employer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employers.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    location_address: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(128))
    zip: Mapped[str | None] = mapped_column(String(16))
    transit_required: Mapped[TransitRequirement] = mapped_column(
        enum_type(TransitRequirement),
        nullable=False,
        default=TransitRequirement.ANY,
        server_default=TransitRequirement.ANY.value,
    )
    transit_accessible: Mapped[bool | None]
    job_lat: Mapped[float | None] = mapped_column(Float)
    job_lon: Mapped[float | None] = mapped_column(Float)
    review_status: Mapped[ListingReviewStatus] = mapped_column(
        enum_type(ListingReviewStatus),
        nullable=False,
        default=ListingReviewStatus.PENDING,
        server_default=ListingReviewStatus.PENDING.value,
    )
    lifecycle_status: Mapped[ListingLifecycleStatus] = mapped_column(
        enum_type(ListingLifecycleStatus),
        nullable=False,
        default=ListingLifecycleStatus.OPEN,
        server_default=ListingLifecycleStatus.OPEN.value,
    )
    review_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    employer = relationship("Employer", back_populates="job_listings")
    reviewer = relationship("AppUser", back_populates="reviewed_listings", foreign_keys=[reviewed_by])
    applications = relationship("Application", back_populates="job_listing")