# Transformative Workforce Academy

TWA is a web application for Saint Louis University's Transformative Workforce Academy. It connects justice-involved jobseekers with fair-chance employers and gives TWA staff tools to manage approvals, matching, applications, placements, notifications, and audit history.

## Architecture

- `frontend/jobseeker`: jobseeker-facing React app
- `frontend/employer`: employer-facing React app
- `frontend/admin`: staff admin React app
- `backend`: FastAPI service for all TWA business logic
- `authSDK`: external authentication service used by this app
- `docker-compose.yml`: local stack for TWA, `authSDK`, PostgreSQL, Adminer, and MailHog

The TWA backend uses `auth-service-sdk` middleware to trust `authSDK` bearer tokens. TWA-specific roles such as `jobseeker`, `employer`, and `staff` are stored locally in the TWA database.

## Local Development Options

### Option 1: Run The Full Docker Stack

1. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

2. Make sure the sibling auth repo exists at `C:\Users\chint\Desktop\authSDK` or update `AUTHSDK_PATH` in `.env`.

3. Start the full stack:

```powershell
docker compose up --build
```

4. Rebuild with `docker compose up --build` after source changes so the Docker images pick up your latest code.

5. Open the local services:

- TWA backend API: `http://localhost:9000`
- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`
- Jobseeker app: `http://localhost:5173`
- Employer app: `http://localhost:5174`
- Admin app: `http://localhost:5175`
- authSDK service: `http://localhost:8000`
- Adminer: `http://localhost:8080`
- MailHog UI: `http://localhost:8025`

Adminer can connect to:

- TWA Postgres host: `twa-postgres`, database: `twa`, username: `twa`, password: `twa`
- authSDK Postgres host: `auth-postgres`, database: `auth_service`, username: `postgres`, password: empty

### Option 2: Run TWA Locally And Reuse Docker For Infrastructure

1. Start the infrastructure services:

```powershell
docker compose up -d twa-postgres auth-postgres auth-redis adminer mailhog auth-service auth-webhook-worker auth-webhook-scheduler
```

2. Install backend dependencies and frontend dependencies:

```powershell
cd backend
uv sync --group dev
cd ..\frontend\jobseeker; npm install
cd ..\employer; npm install
cd ..\admin; npm install
```

3. Run the backend:

```powershell
cd ..\..\backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 9000
```

4. Run the frontends:

```powershell
cd ..\frontend\jobseeker; npm run dev
cd ..\employer; npm run dev
cd ..\admin; npm run dev
```

## Database Migrations

Alembic is configured in `backend/alembic.ini` and `backend/migrations/`.

Common commands:

```powershell
cd backend
uv run alembic upgrade head
uv run alembic revision -m "describe-change"
uv run alembic revision --autogenerate -m "describe-change"
```

A bootstrap migration is already included so the migration pipeline is wired and testable before the real schema lands in Phase 3.

## API Docs

FastAPI serves OpenAPI docs out of the box:

- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`
- OpenAPI JSON: `http://localhost:9000/openapi.json`

## Email Testing

MailHog is included for local notification testing.

- SMTP host: `localhost`
- SMTP port: `1025`
- Web UI: `http://localhost:8025`

## Key Docs

- [project.md](project.md)
- [implementation-guide.md](implementation-guide.md)
- [api-contract.md](api-contract.md)
- [RULES.md](RULES.md)
- [docs/local-development.md](docs/local-development.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [LICENSE](LICENSE)