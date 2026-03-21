# TWA App - End-to-End Build Guide

## Purpose

This document turns the product spec in `project.md` into a step-by-step implementation guide for building the full application from scratch. It is written to help an engineer or small team move from planning to production in a controlled order.

The guide assumes:

- One shared TWA backend API
- Three frontend apps: jobseeker, employer, and staff admin
- PostgreSQL as the main database
- FastAPI for the TWA backend
- React + Tailwind CSS for the frontend
- `authSDK` as the external authentication service
- `auth-service-sdk` middleware in the TWA backend
- TWA-local app roles stored in the TWA database
- Alembic for TWA database migrations
- Docker Compose for the full local stack, including `authSDK`
- MailHog for local email testing and Adminer for database inspection
- Swagger UI and ReDoc for local API exploration
- Email and in-app notifications
- Employers may view applicant charge-category fields
- System-generated audit log entries may use `actor_id = NULL`

---

## Recommended Build Strategy

Build the app in vertical slices, but in an order that protects the foundations first:

1. Repository and local environment setup
2. Backend app skeleton and database connection
3. Database schema and migrations
4. `authSDK` integration and local authorization
5. Shared backend infrastructure
6. Employer onboarding and listing review workflow
7. Jobseeker onboarding and profile workflow
8. GTFS transit and geocoding services
9. Matching engine
10. Applications and hiring workflow
11. Notifications
12. Admin tools and audit log
13. Frontend apps
14. Background jobs
15. Testing, QA, deployment, and launch prep

Do not build the UI first. The core risk in this project is the business logic around matching, review states, privacy, approvals, and local app-role enforcement. Build the backend contract first so the frontends stay simple.

---

## Phase 1: Repository and Environment Setup

### Goal

Create a stable project structure, development environment, and tooling before writing product code.

### Tasks

1. Create the base repo structure:

```text
TWA-OSS/
  backend/
    app/
    data/
    tests/
  frontend/
    jobseeker/
    employer/
    admin/
  shared/
  docs/
```

2. Add a root `.gitignore` for:
   - Python caches
   - Node modules
   - local env files
   - build artifacts
   - `backend/data/metro_stl_gtfs.zip`

3. Initialize backend dependency management.
   - Use `venv` + `pip`, `uv`, or Poetry
   - Keep dependency installation simple for the first version

4. Initialize the three React apps.
   - Prefer Vite for fast local development

5. Add a root `README.md` with:
   - project overview
   - setup commands
   - local dev URLs
   - environment variable list

6. Add formatting and linting tools:
   - Backend: `ruff`, `black`, `pytest`
   - Frontend: `eslint`, `prettier`

7. Add a local `docker-compose.yml` for the full development stack.
   - TWA PostgreSQL
   - TWA backend
   - three frontend apps
   - `authSDK` service and its dependencies
   - Adminer
   - MailHog

8. Prepare local `authSDK` usage.
   - Default local path can point to `\Desktop\authSDK-1.1.0`
   - Record `AUTH_BASE_URL` and `TWA_AUTH_AUDIENCE=twa-api`
   - Make the Docker setup work with a sibling checkout of `authSDK`

9. Add Alembic scaffolding early so migrations are part of the developer workflow from the start.

10. Add GitHub Actions CI for backend tests and frontend builds.

### Deliverables

- Working repo structure
- Local backend app boots
- Local frontend apps boot
- Database available locally
- Full local Docker stack available for TWA plus `authSDK`
- Adminer and MailHog available locally
- Auth-service integration target decided for local development
- Alembic migration pipeline initialized
- GitHub CI validates backend and frontend changes

---

## Phase 2: Backend Skeleton

### Goal

Stand up the FastAPI app with clean module boundaries.

### Tasks

1. Create the main FastAPI entrypoint:
   - `backend/app/main.py`

2. Create app modules:
   - `routers/`
   - `models/`
   - `schemas/`
   - `services/`
   - `core/`
   - `db/`
   - `audit/`

3. Create shared backend primitives:
   - config loader
   - database session dependency
   - error handling
   - auth context utilities
   - response models

4. Add health endpoints:
   - `GET /health`
   - `GET /api/v1/health`

5. Add API versioning early:
   - `/api/v1/...`

6. Keep FastAPI OpenAPI docs enabled from the beginning.
   - Swagger UI at `/docs`
   - ReDoc at `/redoc`

### Deliverables

- FastAPI server starts
- health endpoints work
- router structure in place
- Swagger UI and ReDoc are available locally

---

## Phase 3: Database Design and Migrations

### Goal

Lock in a production-friendly schema before feature work expands.

### Recommended Schema Adjustments

The original spec is a good start, but the following changes will make implementation cleaner:

1. Store local app users separately from authentication provider users.
   - Use `app_users`
   - Key it by `auth_user_id`
   - Store local `app_role`

2. Split review state from lifecycle state on employers and listings.
   - `review_status`: `pending`, `approved`, `rejected`
   - `lifecycle_status`: `open`, `closed`

3. Add timestamps consistently:
   - `created_at`
   - `updated_at`

4. Add review metadata:
   - `review_note`
   - `reviewed_by`
   - `reviewed_at`

5. Track hires cleanly.
   - Keep `applications.status`
   - Add a `placements` table later only if needed

6. Make `audit_log.actor_id` nullable for system actions.

7. Keep charge categories as booleans for v1 because the set is fixed.

### Core Tables

Build these first:

- `app_users`
- `jobseekers`
- `employers`
- `job_listings`
- `applications`
- `notification_config`
- `audit_log`
- optional `notifications`

### Tasks

1. Configure SQLAlchemy models.
2. Configure Alembic migrations.
3. Add a bootstrap migration so the migration path is executable before the real schema lands.
4. Write the initial schema migration.
5. Seed:
   - one staff app user linked to an auth identity
   - default notification config row

### Deliverables

- Migrations run successfully
- Database schema exists locally
- Seed data works

---

## Phase 4: `authSDK` Integration and Local Authorization

### Goal

Use `authSDK` for authentication while keeping TWA-specific roles and authorization local.

### Tasks

1. Integrate `auth-service-sdk` into the TWA backend.
   - Use `JWTAuthMiddleware`
   - Set `expected_audience="twa-api"`

2. Add auth configuration:
   - `AUTH_BASE_URL`
   - `TWA_AUTH_AUDIENCE`

3. Implement local auth-context resolution.
   - Read `sub` from the validated token
   - Resolve local `app_users.auth_user_id`
   - Attach local app user context for downstream handlers

4. Implement local role guards:
   - `jobseeker` routes
   - `employer` routes
   - `staff` routes

5. Build local auth endpoints:
   - `POST /api/v1/auth/bootstrap`
   - `GET /api/v1/auth/me`

6. Define bootstrap behavior.
   - Public authenticated users can bootstrap only `jobseeker` or `employer`
   - Staff accounts are created internally
   - Bootstrap is idempotent

7. Add account state checks:
   - employer cannot use employer features until approved
   - inactive local app users cannot use the TWA backend

8. Decide onboarding flow.
   - Recommended approach: auth-service signup, email verification, login, then TWA bootstrap, then force profile completion before browsing/applying for jobseekers

### Deliverables

- TWA accepts `authSDK` bearer tokens
- Local app-user resolution works
- Local role protection works
- Bootstrap flow works
- `GET /api/v1/auth/me` works

---

## Phase 5: Shared Backend Infrastructure

### Goal

Create reusable building blocks before feature routes multiply.

### Tasks

1. Create a shared audit writer:

```python
def write_audit(
    actor_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
):
    ...
```

2. Create reusable service helpers for:
   - pagination
   - filtering
   - sorting
   - not-found handling
   - permission checks

3. Create standard response shapes for list endpoints.

4. Add request logging and structured server logs.

5. Add centralized validation and exception mapping.

6. Add auth-context helper utilities so route handlers do not parse token state manually.

### Deliverables

- Audit utility reusable across the app
- Consistent API patterns established

---

## Phase 6: Employer Onboarding and Review Workflow

### Goal

Ship the first complete business workflow: auth-service signup, email verification, TWA employer bootstrap, staff approval, listing submission, and review.

### Tasks

1. Build employer bootstrap flow in TWA.
2. Create employer profile after local bootstrap.
3. Default new employers to `review_status = pending`.
4. Build staff queue endpoints for employers.
5. Add staff actions:
   - approve
   - reject
   - reassess rejected employers later

6. Build employer dashboard endpoint:
   - show account review status

7. Build listing submission endpoint for approved employers only.

8. Add listing review fields:
   - title
   - description
   - address
   - city
   - zip
   - transit requirement
   - disqualifying charge categories

9. Build staff listing review queue.

10. Allow staff to:

- approve listing
- reject listing
- later reassess and approve a previously rejected listing
- close listing after hires or when no longer needed

### Recommended Listing State Model

Use:

- `review_status`: `pending`, `approved`, `rejected`
- `lifecycle_status`: `open`, `closed`

This avoids forcing one column to do two jobs.

### Deliverables

- Employer bootstrap flow works
- Staff approval flow works
- Approved employers can submit listings
- Staff can review listings end to end

---

## Phase 7: Jobseeker Onboarding and Profile Workflow

### Goal

Enable jobseekers to create a usable profile for matching.

### Tasks

1. Build jobseeker bootstrap flow in TWA.
2. Create jobseeker profile setup endpoint.
3. Add profile fields:
   - full name
   - phone
   - address
   - city
   - zip
   - transit type
   - charge categories

4. Enforce profile completion before:
   - browsing jobs
   - applying

5. Build jobseeker self-service profile update endpoint.

6. Build staff jobseeker management endpoints:
   - list
   - search
   - edit
   - mark hired

### Deliverables

- Jobseeker bootstrap works
- Jobseeker can complete profile
- Staff can manage profiles

---

## Phase 8: GTFS Transit and Geocoding Services

### Goal

Implement location intelligence required by the matching logic.

### Tasks

1. Create `backend/data/`.
2. Download the Metro St. Louis GTFS feed to:
   - `backend/data/metro_stl_gtfs.zip`

3. Add feed file to `.gitignore`.

4. Implement `backend/app/services/transit.py`:
   - GTFS stop loading
   - stop caching
   - transit accessibility check
   - zip-to-job distance calculation

5. Implement `backend/app/services/geocoding.py`:
   - address geocoding
   - timeout and error handling

6. Hook geocoding and transit computation into listing creation and listing review.

7. Decide when the computation occurs.
   - Recommended: geocode and compute on listing submission, then recompute on approval if data changed

8. Handle failure cases:
   - geocoding fails
   - GTFS file missing
   - transit computation unavailable

### Recommended Behavior

- If geocoding fails, keep the listing in reviewable state but flag it for staff attention.
- Do not crash listing creation because a third-party lookup failed.
- If `transit_accessible` cannot be computed, store `NULL` and surface a staff-side warning.

### Deliverables

- Job addresses geocode
- Transit accessibility is computed
- Distance helper is available for matching

---

## Phase 9: Matching Engine

### Goal

Implement the core product value: two-way matching.

### Tasks

1. Build helper functions:
   - `charges_overlap(jobseeker, listing)`
   - `check_transit_compat(jobseeker, listing)`

2. Implement:
   - `get_eligible_jobs_for_jobseeker(jobseeker_id)`
   - `get_eligible_jobseekers_for_job(job_listing_id)`

3. Return all records with eligibility metadata.

4. Follow privacy/display rules:
   - Jobseekers do not see charge-based rejection reasons
   - Jobseekers may see distance-based ineligibility tags
   - Staff sees the full reasoning
   - Employers may view applicant charge data based on your clarified requirement

5. Build admin endpoints for both directions of matching.

6. Add unit tests for all combinations:
   - charge mismatch
   - transit mismatch
   - both mismatch
   - eligible
   - missing geocode/transit data

### Deliverables

- Matching service works
- Staff can run both match views
- Jobseeker job board can use eligibility flags

---

## Phase 10: Applications and Hiring Workflow

### Goal

Make the app operational for real placements.

### Tasks

1. Build application submission endpoint.
2. Prevent duplicate applications for the same job unless repeat applications are intentionally allowed.
   - Recommended: one application per jobseeker per listing

3. Build jobseeker application list endpoint.
4. Build staff application tracker endpoints.
5. Allow staff to update application status:
   - submitted
   - reviewed
   - hired

6. Allow staff to mark a jobseeker hired for a specific listing.
7. Keep jobseekers eligible to apply elsewhere after being hired.
8. Give staff the option to close the job after a hire.

### Recommended Rule

Treat hire as application-specific, not person-wide lockout. That matches your clarified requirement and keeps future placements flexible.

### Deliverables

- Jobseeker can apply
- Staff can track and update applications
- Staff can mark hires and close listings

---

## Phase 11: Notifications

### Goal

Support both operational alerts and user-facing communication.

### Tasks

1. Implement the `notification_config` table and admin endpoints.
2. Create notification channels:
   - email
   - in-app

3. Create notification events:
   - application submitted
   - employer approved
   - employer rejected
   - listing approved
   - listing rejected
   - possibly hire-related events

4. Add service layer:
   - `dispatch_notification(event_type, recipients, payload)`

5. For in-app notifications, decide storage model.
   - Recommended: add a `notifications` table with `read_at`

6. For email, start with a provider abstraction.
   - examples: SendGrid, Postmark, Resend

7. Respect config toggles before dispatch.

### Deliverables

- Staff can change config
- Email and in-app notifications fire correctly

---

## Phase 12: Audit Log and Admin Features

### Goal

Give TWA staff operational control and accountability.

### Tasks

1. Call `write_audit()` on every write action that changes business records.
2. Create audit log query endpoint with filters:
   - actor
   - entity type
   - entity id
   - date range

3. Build admin endpoints for:
   - dashboard
   - employer queue
   - employer list
   - listing queue
   - listing manager
   - jobseeker list
   - jobseeker profile
   - application tracker
   - notification config
   - audit log

4. Add system-generated audit entries for:
   - GTFS refresh
   - background maintenance tasks if relevant

### Deliverables

- Audit entries are complete and queryable
- Admin API surface is ready for UI integration

---

## Phase 13: Frontend Implementation

### Goal

Build the three frontend apps against stable API contracts.

## 13A. Shared UI Foundation

### Tasks

1. Create shared design tokens in `shared/`.
2. Create reusable UI primitives:
   - form fields
   - buttons
   - cards
   - tables
   - alerts
   - badges
   - modals

3. Add shared API client utilities:
   - auth token handling
   - base fetch wrapper
   - error handling
   - auth-context bootstrap helper

4. Define route guards by local app role.

5. Integrate frontend auth flows with `authSDK`.
   - signup
   - login
   - token refresh
   - logout
   - password reset if exposed in v1

### Deliverables

- Shared styles and components work across apps
- Frontend auth flow aligns with `authSDK`

## 13B. Jobseeker App

### Tasks

1. Build signup, email verification resend, and login handoff to `authSDK`.
2. Build TWA bootstrap/profile-setup flow.
3. Build job board.
4. Build job detail screen.
5. Build application submission flow.
6. Build my applications screen.
7. Enforce profile-complete checks in UI.

### UX Rules

- Show all active listings
- Display eligibility clearly
- Never display charge-based rejection reasons to jobseekers
- Disable apply when the listing is ineligible

## 13C. Employer App

### Tasks

1. Build signup, email verification resend, and login handoff to `authSDK`.
2. Build employer bootstrap flow.
3. Build dashboard with approval status.
4. Build submit listing form.
5. Build my listings screen.
6. Build applicants screen when sharing is enabled.

### UX Rules

- If employer is pending or rejected, explain status clearly
- If applicant sharing is disabled, do not expose partial applicant data
- If enabled, show the agreed applicant fields, including charge fields based on your current requirement

## 13D. Staff Admin App

### Tasks

1. Build staff login integration.
2. Build dashboard.
3. Build employer queue and employer list.
4. Build listing queue and listing manager.
5. Build jobseeker list and profile editor.
6. Build match views.
7. Build application tracker.
8. Build notification config page.
9. Build audit log screen.

### Deliverables

- All three apps work against the shared backend

---

## Phase 14: Background Jobs and Scheduled Tasks

### Goal

Keep transit data and operational tasks fresh without manual work.

### Tasks

1. Implement GTFS refresh job:
   - download latest feed
   - replace stored zip
   - clear stop cache
   - recompute `transit_accessible`
   - write audit entry

2. Decide scheduler approach:
   - APScheduler inside backend for v1
   - or platform cron if hosting makes that easier

3. Add retry and failure logging.

4. Ensure the job is safe to run more than once.

### Deliverables

- Scheduled GTFS refresh works
- Failures are visible

---

## Phase 15: Testing and QA

### Goal

Catch regressions before users do.

### Backend Tests

Write tests for:

- `authSDK` token acceptance in TWA
- local auth bootstrap flow
- local role guards
- employer approval gates
- listing review workflow
- jobseeker profile completion gate
- geocoding failure handling
- transit accessibility checks
- matching logic
- application workflow
- hiring workflow
- notification config behavior
- audit log creation

### Frontend Tests

Write tests for:

- protected routes
- signup, verification, and login handoff to `authSDK`
- bootstrap flows
- form validation
- job board eligibility rendering
- listing submission
- admin review actions

### Manual QA Pass

Run these end-to-end scenarios:

1. Employer signs up through `authSDK`, verifies email, logs in, bootstraps into TWA, waits for approval, gets approved, submits listing, listing gets approved.
2. Jobseeker signs up through `authSDK`, verifies email, logs in, bootstraps into TWA, completes profile, views jobs, sees eligible and ineligible states, applies.
3. Staff logs in, reviews application, marks hired, and optionally closes listing.
4. Employer applicant visibility toggles off and on correctly.
5. Audit log records all changes.
6. GTFS data refresh does not break listing visibility.

### Deliverables

- Core flows covered by automated tests
- Manual QA checklist completed

---

## Phase 16: Deployment and Production Readiness

### Goal

Launch safely with enough observability and operational discipline.

### Tasks

1. Choose hosting:
   - Render or Railway is fine for v1

2. Provision:
   - TWA backend service
   - PostgreSQL
   - deployed `authSDK` service
   - static frontend hosting or separate frontend services

3. Set production environment variables:
   - database URL
   - `AUTH_BASE_URL`
   - `TWA_AUTH_AUDIENCE`
   - frontend origins
   - email provider credentials
   - geocoding provider credentials if upgraded from Nominatim

4. Enable CORS correctly for the three frontends and the auth service.

5. Run migrations automatically during deploy.

6. Add monitoring:
   - app logs
   - error tracking
   - uptime checks

7. Add database backups.

8. Add basic admin security practices:
   - strong staff passwords
   - invite-only staff creation
   - optional MFA later

### Deliverables

- Production environment deployed
- Monitoring and backups enabled
