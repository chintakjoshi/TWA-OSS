# Transformative Workforce Academy [![CI Tests](https://github.com/chintakjoshi/TWA-OSS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/chintakjoshi/TWA-OSS/actions/workflows/ci.yml)

TWA is a multi-portal workforce platform for Saint Louis University's Transformative Workforce Academy. It connects justice-involved jobseekers with fair-chance employers and gives staff a single system for onboarding, review, matching, applications, notifications, and audit history.

## Repo At A Glance

- `backend/`: FastAPI application, SQLAlchemy models, Alembic migrations, and backend tests
- `frontend/jobseeker/`: jobseeker React app
- `frontend/employer/`: employer React app
- `frontend/admin/`: staff admin React app
- `shared/frontend/`: shared UI primitives, tokens, auth helpers, and route guards
- `docs/`: setup guides, architecture notes, QA docs, and long-form reference material
- `docker-compose.yml`: full local stack for TWA, authSDK, PostgreSQL, Adminer, and MailHog

The TWA backend trusts `authSDK` bearer tokens through `auth-service-sdk`, but application roles such as `jobseeker`, `employer`, and `staff` stay local to the TWA database. In local development, the frontend apps use a same-origin `/_auth` proxy to avoid browser CORS issues and keep `/auth` free for the SPAs themselves.

## Quick Start

1. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

2. Start the full local stack:

```powershell
docker compose up
```

3. Open the local services:

- TWA backend API: `http://localhost:9000`
- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`
- Jobseeker app: `http://localhost:5173`
- Employer app: `http://localhost:5174`
- Admin app: `http://localhost:5175`
- authSDK service: `http://localhost:8000`
- Adminer: `http://localhost:8080`
- MailHog UI: `http://localhost:8025`

For host-based development, authSDK local-build overrides, seeding, and environment details, use [docs/local-development.md](docs/local-development.md).

## Common Commands

Install backend dependencies:

```powershell
cd backend
uv sync --group dev
```

Install shared frontend dependencies:

```powershell
npm install
cd frontend\jobseeker; npm install
cd ..\employer; npm install
cd ..\admin; npm install
```

Run backend checks:

```powershell
cd backend
uv run ruff check .
uv run black --check .
uv run pytest
```

Run frontend checks:

```powershell
npm run lint:frontend
npm run test:frontend
npm run format:check
```

## Documentation

Start with the docs index at [docs/README.md](docs/README.md).

- Setup and workflow: [docs/local-development.md](docs/local-development.md)
- Architecture and boundaries: [docs/architecture.md](docs/architecture.md)
- Testing and QA: [docs/testing-and-qa.md](docs/testing-and-qa.md)
- API reference: [docs/reference/api-contract.md](docs/reference/api-contract.md)
- Product reference: [docs/reference/project-specification.md](docs/reference/project-specification.md)
- Engineering standards: [docs/reference/engineering-rules.md](docs/reference/engineering-rules.md)

## Community Docs

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [LICENSE](LICENSE)

## CI

GitHub Actions CI lives in `.github/workflows/ci.yml` and runs backend lint/tests, frontend lint/format/tests, and builds for all three frontend apps on pushes, pull requests, and manual dispatches.
