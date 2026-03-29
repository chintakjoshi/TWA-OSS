# Architecture

This document describes the current repository shape and the major boundaries in the TWA system.

## System Overview

TWA is organized as one backend plus three frontend portals:

- `frontend/jobseeker/`: jobseeker-facing portal for profile setup, job browsing, and applications
- `frontend/employer/`: employer-facing portal for onboarding, profile management, listings, and applicants
- `frontend/admin/`: staff portal for approvals, listings, jobseekers, applications, matching, notifications, and audit review
- `backend/`: FastAPI service that owns business rules, persistence, authorization, matching, notifications, and audit logging
- `shared/frontend/`: shared UI tokens, primitive components, auth helpers, and role guards used across all React apps

## Auth Boundary

Authentication and authorization are intentionally split:

- `authSDK` handles signup, login, token lifecycle, verification, logout, and upstream auth concerns.
- The TWA backend validates `authSDK` tokens with `auth-service-sdk`.
- TWA-local roles such as `jobseeker`, `employer`, and `staff` live in the TWA database and drive application authorization.

Browser clients now use cookie-backed authSDK sessions:

- frontend apps call same-origin `/_auth` for authSDK flows
- frontend apps call same-origin `/api` for TWA API traffic
- the shared frontend auth client uses `credentials: include` rather than
  storing bearer tokens in `localStorage`
- the backend accepts access cookies in auth middleware and enforces CSRF on
  unsafe cookie-authenticated requests

In local development, the frontend apps let Vite proxy both `/_auth` and
`/api`. That keeps browser traffic same-origin while preserving the
production-style auth and API boundaries.

## Backend Layout

The backend code is centered under `backend/app/`:

- `routers/` and `routers/v1/`: HTTP entry points
- `models/`: SQLAlchemy models for app users, employers, jobseekers, listings, applications, notifications, and audit records
- `schemas/`: Pydantic request and response types
- `services/`: business logic for auth bootstrap, employer and jobseeker flows, matching, transit, notifications, and admin features
- `db/`: session and seed helpers
- `audit/`: reusable audit snapshot and write helpers
- `core/`: settings, middleware, exceptions, logging, and auth helpers

The FastAPI app exposes:

- `/health`
- `/api/v1/health`
- `/docs`
- `/redoc`
- `/openapi.json`

The main product routes live under `/api/v1` and cover auth bootstrap, jobseeker flows, employer flows, staff admin workflows, applications, notifications, and matching.

## Frontend Layout

Each frontend app is a standalone Vite project with its own `package.json`, build config, and source tree. Shared React dependencies that are required by `shared/frontend/` are managed from the repo root.

Common frontend patterns in this repo:

- role-aware auth bootstrap
- shared auth console and route guards
- shared design tokens and reusable UI primitives
- app-specific pages for portal workflows

## Data And Infrastructure

Local infrastructure is orchestrated by `docker-compose.yml` and includes:

- TWA PostgreSQL
- authSDK PostgreSQL
- authSDK Redis
- TWA backend
- all three frontend apps
- Adminer
- MailHog

Alembic migrations live in `backend/migrations/`. Backend configuration is defined through `.env` and read by `backend/app/core/config.py`.

Transit accessibility and geocoding logic live in backend services. The repo currently includes a local GTFS zip at `backend/data/metro_stl_gtfs.zip`, and listing creation is designed to degrade gracefully when geocoding or transit computation is unavailable.

## Key Workflows Represented In Code

- Authenticated users bootstrap into a local TWA role through `/api/v1/auth/bootstrap`.
- Employers require staff approval before submitting listings.
- Jobseekers complete a profile before browsing or applying.
- Staff can review employers, listings, jobseekers, applications, notifications, matching results, and audit history from the admin app.
- Notifications and audit records are part of the product surface, not bolt-on concerns.

For endpoint-level detail, use [reference/api-contract.md](reference/api-contract.md). For setup, use [local-development.md](local-development.md).
