from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EmployerReviewStatus, enum_type
from app.models.mixins import AddressMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Employer(UUIDPrimaryKeyMixin, TimestampMixin, AddressMixin, Base):
    __tablename__ = "employers"
    __table_args__ = (
        UniqueConstraint("app_user_id", name="uq_employers_app_user_id"),
        Index("ix_employers_review_status", "review_status"),
        Index("ix_employers_org_name", "org_name"),
    )

    app_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.id"), nullable=False)
    org_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32))
    review_status: Mapped[EmployerReviewStatus] = mapped_column(
        enum_type(EmployerReviewStatus),
        nullable=False,
        default=EmployerReviewStatus.PENDING,
        server_default=EmployerReviewStatus.PENDING.value,
    )
    review_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    app_user = relationship("AppUser", back_populates="employer_profile", foreign_keys=[app_user_id])
    reviewer = relationship("AppUser", back_populates="reviewed_employers", foreign_keys=[reviewed_by])
    job_listings = relationship("JobListing", back_populates="employer")