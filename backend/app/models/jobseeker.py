from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import JobseekerStatus, TransitType, enum_type
from app.models.mixins import (
    AddressMixin,
    ChargeFlagsMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Jobseeker(
    UUIDPrimaryKeyMixin, TimestampMixin, AddressMixin, ChargeFlagsMixin, Base
):
    __tablename__ = "jobseekers"
    __table_args__ = (
        UniqueConstraint("app_user_id", name="uq_jobseekers_app_user_id"),
        Index("ix_jobseekers_status", "status"),
        Index("ix_jobseekers_city", "city"),
        Index("ix_jobseekers_zip", "zip"),
    )

    app_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_users.id"), nullable=False
    )
    full_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32))
    transit_type: Mapped[TransitType | None] = mapped_column(
        enum_type(TransitType), nullable=True
    )
    status: Mapped[JobseekerStatus] = mapped_column(
        enum_type(JobseekerStatus),
        nullable=False,
        default=JobseekerStatus.ACTIVE,
        server_default=JobseekerStatus.ACTIVE.value,
    )

    app_user = relationship("AppUser", back_populates="jobseeker_profile")
    applications = relationship("Application", back_populates="jobseeker")
