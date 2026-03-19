"""create core schema

Revision ID: 65aa5bc22b82
Revises: 0001_bootstrap_alembic
Create Date: 2026-03-18 21:16:40.494198
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "65aa5bc22b82"
down_revision = "0001_bootstrap_alembic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_users",
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("auth_provider_role", sa.String(length=50), nullable=False),
        sa.Column(
            "app_role",
            sa.Enum(
                "jobseeker", "employer", "staff", name="approle", native_enum=False
            ),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_user_id"),
    )
    op.create_index("ix_app_users_app_role", "app_users", ["app_role"], unique=False)
    op.create_index("ix_app_users_email", "app_users", ["email"], unique=False)
    op.create_index("ix_app_users_is_active", "app_users", ["is_active"], unique=False)
    op.create_table(
        "audit_log",
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column(
            "old_value",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            nullable=True,
        ),
        sa.Column(
            "new_value",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            nullable=True,
        ),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_actor_id", "audit_log", ["actor_id"], unique=False)
    op.create_index("ix_audit_log_entity_id", "audit_log", ["entity_id"], unique=False)
    op.create_index(
        "ix_audit_log_entity_type", "audit_log", ["entity_type"], unique=False
    )
    op.create_index("ix_audit_log_timestamp", "audit_log", ["timestamp"], unique=False)
    op.create_table(
        "employers",
        sa.Column("app_user_id", sa.Uuid(), nullable=False),
        sa.Column("org_name", sa.String(length=255), nullable=False),
        sa.Column("contact_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column(
            "review_status",
            sa.Enum(
                "pending",
                "approved",
                "rejected",
                name="employerreviewstatus",
                native_enum=False,
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("zip", sa.String(length=16), nullable=True),
        sa.ForeignKeyConstraint(
            ["app_user_id"],
            ["app_users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("app_user_id", name="uq_employers_app_user_id"),
    )
    op.create_index("ix_employers_org_name", "employers", ["org_name"], unique=False)
    op.create_index(
        "ix_employers_review_status", "employers", ["review_status"], unique=False
    )
    op.create_table(
        "jobseekers",
        sa.Column("app_user_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column(
            "transit_type",
            sa.Enum(
                "own_car",
                "public_transit",
                "both",
                name="transittype",
                native_enum=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum("active", "hired", name="jobseekerstatus", native_enum=False),
            server_default="active",
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("zip", sa.String(length=16), nullable=True),
        sa.Column(
            "charge_sex_offense", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column(
            "charge_violent", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column("charge_armed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "charge_children", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column("charge_drug", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("charge_theft", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(
            ["app_user_id"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("app_user_id", name="uq_jobseekers_app_user_id"),
    )
    op.create_index("ix_jobseekers_city", "jobseekers", ["city"], unique=False)
    op.create_index("ix_jobseekers_status", "jobseekers", ["status"], unique=False)
    op.create_index("ix_jobseekers_zip", "jobseekers", ["zip"], unique=False)
    op.create_table(
        "notification_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "notify_staff_on_apply", sa.Boolean(), server_default="true", nullable=False
        ),
        sa.Column(
            "notify_employer_on_apply",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "share_applicants_with_employer",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint("id = 1", name="ck_notification_config_singleton"),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "notifications",
        sa.Column("app_user_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False),
        sa.Column(
            "channel",
            sa.Enum("email", "in_app", name="notificationchannel", native_enum=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["app_user_id"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notifications_app_user_id", "notifications", ["app_user_id"], unique=False
    )
    op.create_index(
        "ix_notifications_channel", "notifications", ["channel"], unique=False
    )
    op.create_index(
        "ix_notifications_created_at", "notifications", ["created_at"], unique=False
    )
    op.create_index(
        "ix_notifications_read_at", "notifications", ["read_at"], unique=False
    )
    op.create_table(
        "job_listings",
        sa.Column("employer_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location_address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("zip", sa.String(length=16), nullable=True),
        sa.Column(
            "transit_required",
            sa.Enum("own_car", "any", name="transitrequirement", native_enum=False),
            server_default="any",
            nullable=False,
        ),
        sa.Column("transit_accessible", sa.Boolean(), nullable=True),
        sa.Column("job_lat", sa.Float(), nullable=True),
        sa.Column("job_lon", sa.Float(), nullable=True),
        sa.Column(
            "review_status",
            sa.Enum(
                "pending",
                "approved",
                "rejected",
                name="listingreviewstatus",
                native_enum=False,
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "lifecycle_status",
            sa.Enum("open", "closed", name="listinglifecyclestatus", native_enum=False),
            server_default="open",
            nullable=False,
        ),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "disq_sex_offense", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column("disq_violent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("disq_armed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "disq_children", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column("disq_drug", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("disq_theft", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(
            ["employer_id"],
            ["employers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"],
            ["app_users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_listings_city", "job_listings", ["city"], unique=False)
    op.create_index(
        "ix_job_listings_employer_id", "job_listings", ["employer_id"], unique=False
    )
    op.create_index(
        "ix_job_listings_lifecycle_status",
        "job_listings",
        ["lifecycle_status"],
        unique=False,
    )
    op.create_index(
        "ix_job_listings_review_status", "job_listings", ["review_status"], unique=False
    )
    op.create_index("ix_job_listings_zip", "job_listings", ["zip"], unique=False)
    op.create_table(
        "applications",
        sa.Column("jobseeker_id", sa.Uuid(), nullable=False),
        sa.Column("job_listing_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "submitted",
                "reviewed",
                "hired",
                name="applicationstatus",
                native_enum=False,
            ),
            server_default="submitted",
            nullable=False,
        ),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["job_listing_id"],
            ["job_listings.id"],
        ),
        sa.ForeignKeyConstraint(
            ["jobseeker_id"],
            ["jobseekers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "jobseeker_id", "job_listing_id", name="uq_applications_jobseeker_listing"
        ),
    )
    op.create_index(
        "ix_applications_job_listing_id",
        "applications",
        ["job_listing_id"],
        unique=False,
    )
    op.create_index(
        "ix_applications_jobseeker_id", "applications", ["jobseeker_id"], unique=False
    )
    op.create_index("ix_applications_status", "applications", ["status"], unique=False)
    op.execute(
        sa.text(
            "INSERT INTO notification_config (id, notify_staff_on_apply, notify_employer_on_apply, share_applicants_with_employer) "
            "VALUES (1, true, false, false) ON CONFLICT (id) DO NOTHING"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_applications_status", table_name="applications")
    op.drop_index("ix_applications_jobseeker_id", table_name="applications")
    op.drop_index("ix_applications_job_listing_id", table_name="applications")
    op.drop_table("applications")
    op.drop_index("ix_job_listings_zip", table_name="job_listings")
    op.drop_index("ix_job_listings_review_status", table_name="job_listings")
    op.drop_index("ix_job_listings_lifecycle_status", table_name="job_listings")
    op.drop_index("ix_job_listings_employer_id", table_name="job_listings")
    op.drop_index("ix_job_listings_city", table_name="job_listings")
    op.drop_table("job_listings")
    op.drop_index("ix_notifications_read_at", table_name="notifications")
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_channel", table_name="notifications")
    op.drop_index("ix_notifications_app_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("notification_config")
    op.drop_index("ix_jobseekers_zip", table_name="jobseekers")
    op.drop_index("ix_jobseekers_status", table_name="jobseekers")
    op.drop_index("ix_jobseekers_city", table_name="jobseekers")
    op.drop_table("jobseekers")
    op.drop_index("ix_employers_review_status", table_name="employers")
    op.drop_index("ix_employers_org_name", table_name="employers")
    op.drop_table("employers")
    op.drop_index("ix_audit_log_timestamp", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_type", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_id", table_name="audit_log")
    op.drop_index("ix_audit_log_actor_id", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_index("ix_app_users_is_active", table_name="app_users")
    op.drop_index("ix_app_users_email", table_name="app_users")
    op.drop_index("ix_app_users_app_role", table_name="app_users")
    op.drop_table("app_users")
