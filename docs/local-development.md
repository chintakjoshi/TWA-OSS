# Local Development

The repo supports two main local workflows:

1. Run the full stack in Docker.
2. Run TWA code on the host while Docker provides infrastructure and auth services.

## Prerequisites

- Docker Desktop with Compose support
- Python 3.12 and `uv` for backend host development
- Node.js and npm for frontend host development

## Full Docker Workflow

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Start the full stack:

```powershell
docker compose up
```

If you want Docker to build `authSDK` from a local checkout instead of pulling `AUTH_SERVICE_IMAGE`, use:

```powershell
docker compose -f docker-compose.yml -f docker-compose.authsdk.local.yml up --build
```

That override reads `AUTHSDK_PATH`, which defaults to `../authSDK`.
It is also the supported way to test browser cookie sessions against an
unreleased local `authSDK` checkout because it:

- builds the auth service from your local path
- keeps browser auth traffic on same-origin `/_auth`
- points browser API traffic at same-origin `/api` through the frontend dev
  proxy using the same defaults as the main Docker stack

Example using a sibling `../authSDK` checkout:

```powershell
$env:AUTHSDK_PATH = '..\\authSDK'
docker compose -f docker-compose.yml -f docker-compose.authsdk.local.yml up --build
```

## Host Workflow

Start infrastructure and auth services:

```powershell
docker compose up -d twa-postgres auth-postgres auth-redis adminer mailhog auth-service auth-webhook-worker auth-webhook-scheduler
```

Install backend dependencies:

```powershell
cd backend
uv sync --group dev
```

Install frontend dependencies:

```powershell
cd ..
npm install
cd frontend\jobseeker; npm install
cd ..\employer; npm install
cd ..\admin; npm install
```

Run migrations and start the backend:

```powershell
cd ..\..\backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 9000
```

Optionally copy the frontend env templates before starting the apps:

```powershell
Copy-Item frontend\jobseeker\.env.example frontend\jobseeker\.env.local
Copy-Item frontend\employer\.env.example frontend\employer\.env.local
Copy-Item frontend\admin\.env.example frontend\admin\.env.local
```

Run the frontend apps:

```powershell
cd ..\frontend\jobseeker; npm run dev
cd ..\employer; npm run dev
cd ..\admin; npm run dev
```

## Same-Origin Browser Auth Model

TWA browser apps now use authSDK cookie sessions instead of persisting raw
access and refresh tokens in browser storage.

In local development that means:

- browser auth calls should go to `/_auth`
- browser API calls should go to `/api`
- the Vite dev servers proxy `/_auth` to authSDK and `/api` to the TWA backend
- frontend apps should not call `http://localhost:8000` or
  `http://localhost:9000` directly from browser code unless you are
  intentionally bypassing the supported local setup

The default frontend config now treats the TWA API as same-origin. You only
need `VITE_TWA_API_URL` if you are deliberately overriding that behavior for a
nonstandard environment.

## Local URLs

- TWA backend API: `http://localhost:9000`
- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`
- authSDK: `http://localhost:8000`
- Jobseeker app: `http://localhost:5173`
- Employer app: `http://localhost:5174`
- Admin app: `http://localhost:5175`
- Adminer: `http://localhost:8080`
- MailHog UI: `http://localhost:8025`

## Database Access

Adminer can connect with the following values:

- TWA app database: system `PostgreSQL`, server `twa-postgres`, username `twa`, password `twa`, database `twa`
- authSDK database: system `PostgreSQL`, server `auth-postgres`, username `postgres`, password any value, database `auth_service`

The local authSDK Postgres container uses trust auth, so Adminer may still ask for text in the password field even though Postgres does not validate it.

## Environment Notes

- `docker-compose.yml` pulls authSDK from `ghcr.io/chintakjoshi/auth-service:v1.3.1` by default.
- The main Docker stack enables authSDK browser sessions by default and routes frontend API traffic through the same-origin `/api` proxy.
- Local HTTP development uses non-`__Host-` auth cookie names on purpose. Browsers require `__Host-` cookies to be `Secure`, so those names only make sense once you are running over real HTTPS.
- Backend debug mode now defaults to off. Set `TWA_DEBUG=true` in your local `.env` only when you intentionally need framework debug behavior while troubleshooting.
- Frontend auth requests should use `/_auth` and rely on the local proxy target rather than calling `http://localhost:8000` directly from the browser.
- Frontend API requests should use `/api` and rely on the local proxy target rather than calling `http://localhost:9000` directly from the browser.
- Cookie-authenticated unsafe requests require CSRF protection. The shared frontend auth client handles the CSRF bootstrap and header automatically.
- Run `npm install` at the repo root so `shared/frontend/` can resolve shared React dependencies.
- `twa-backend` applies `alembic upgrade head` on container startup.
- TWA notification email defaults are already wired to local MailHog.

## Seeds And Migrations

Common backend commands:

```powershell
cd backend
uv run alembic upgrade head
uv run alembic revision -m "describe-change"
uv run alembic revision --autogenerate -m "describe-change"
uv run python -m app.db.seed
```

Set `TWA_SEED_STAFF_AUTH_USER_ID` and `TWA_SEED_STAFF_EMAIL` in `.env` if you want the seed command to create or refresh a local staff app user in addition to the default notification config row.

## Transit Data Note

Transit accessibility uses the Metro St. Louis GTFS feed and reads from `backend/data/metro_stl_gtfs.zip`. The repo currently includes a local copy of that file, so treat it as application data when refreshing or replacing it locally.
