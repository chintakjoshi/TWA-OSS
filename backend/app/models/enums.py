from enum import StrEnum

from sqlalchemy import Enum as SqlEnum


class AppRole(StrEnum):
    JOBSEEKER = "jobseeker"
    EMPLOYER = "employer"
    STAFF = "staff"


class AuthProviderRole(StrEnum):
    USER = "user"
    ADMIN = "admin"
    SERVICE = "service"


class JobseekerStatus(StrEnum):
    ACTIVE = "active"
    HIRED = "hired"


class EmployerReviewStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingReviewStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingLifecycleStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"


class TransitType(StrEnum):
    OWN_CAR = "own_car"
    PUBLIC_TRANSIT = "public_transit"
    BOTH = "both"


class TransitRequirement(StrEnum):
    OWN_CAR = "own_car"
    ANY = "any"


class ApplicationStatus(StrEnum):
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    HIRED = "hired"


class NotificationChannel(StrEnum):
    EMAIL = "email"
    IN_APP = "in_app"


def enum_type(enum_cls: type[StrEnum]) -> SqlEnum:
    return SqlEnum(
        enum_cls,
        native_enum=False,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )
