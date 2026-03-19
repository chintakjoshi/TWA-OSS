from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class AddressMixin:
    address: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(128))
    zip: Mapped[str | None] = mapped_column(String(16))


class ChargeFlagsMixin:
    charge_sex_offense: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    charge_violent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    charge_armed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    charge_children: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    charge_drug: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    charge_theft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")


class DisqualifyingChargeFlagsMixin:
    disq_sex_offense: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    disq_violent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    disq_armed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    disq_children: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    disq_drug: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    disq_theft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")