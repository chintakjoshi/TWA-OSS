from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ApplicationStatus, enum_type
from app.models.mixins import UUIDPrimaryKeyMixin


class Application(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("jobseeker_id", "job_listing_id", name="uq_applications_jobseeker_listing"),
        Index("ix_applications_status", "status"),
        Index("ix_applications_jobseeker_id", "jobseeker_id"),
        Index("ix_applications_job_listing_id", "job_listing_id"),
    )

    jobseeker_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobseekers.id"), nullable=False)
    job_listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("job_listings.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        enum_type(ApplicationStatus),
        nullable=False,
        default=ApplicationStatus.SUBMITTED,
        server_default=ApplicationStatus.SUBMITTED.value,
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    jobseeker = relationship("Jobseeker", back_populates="applications")
    job_listing = relationship("JobListing", back_populates="applications")