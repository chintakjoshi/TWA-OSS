from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AppRole, enum_type
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppUser(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "app_users"
    __table_args__ = (
        Index("ix_app_users_email", "email"),
        Index("ix_app_users_app_role", "app_role"),
        Index("ix_app_users_is_active", "is_active"),
    )

    auth_user_id: Mapped[uuid.UUID] = mapped_column(nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    auth_provider_role: Mapped[str] = mapped_column(String(50), nullable=False)
    app_role: Mapped[AppRole | None] = mapped_column(enum_type(AppRole), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    jobseeker_profile = relationship(
        "Jobseeker",
        back_populates="app_user",
        uselist=False,
        foreign_keys="Jobseeker.app_user_id",
    )
    employer_profile = relationship(
        "Employer",
        back_populates="app_user",
        uselist=False,
        foreign_keys="Employer.app_user_id",
    )
    reviewed_employers = relationship(
        "Employer",
        back_populates="reviewer",
        foreign_keys="Employer.reviewed_by",
    )
    reviewed_listings = relationship(
        "JobListing",
        back_populates="reviewer",
        foreign_keys="JobListing.reviewed_by",
    )
    notifications = relationship("Notification", back_populates="app_user")