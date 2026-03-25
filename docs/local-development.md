# Local Development Stack

The repo supports two local workflows:

1. Run everything through `docker compose`
2. Run TWA code on the host while Docker handles infrastructure and `authSDK`

## Services Included

- `twa-postgres`: TWA application database
- `twa-backend`: FastAPI backend
- `frontend-jobseeker`: jobseeker React app
- `frontend-employer`: employer React app
- `frontend-admin`: staff admin React app
- `auth-postgres`: authSDK database
- `auth-redis`: authSDK Redis dependency
- `auth-service`: authSDK API
- `auth-webhook-worker`: authSDK background worker
- `auth-webhook-scheduler`: authSDK scheduler
- `adminer`: local database UI
- `mailhog`: local SMTP capture and email viewer for both authSDK and TWA notification emails

## Default Ports

- `8000`: authSDK API
- `8080`: Adminer
- `8025`: MailHog UI
- `1025`: MailHog SMTP
- `9000`: TWA backend
- `5173`: jobseeker app
- `5174`: employer app
- `5175`: admin app
- `5432`: TWA Postgres
- `5433`: authSDK Postgres
- `6380`: authSDK Redis

## Notes

- `docker-compose.yml` pulls authSDK from `AUTH_SERVICE_IMAGE` by default and pins to `ghcr.io/chintakjoshi/auth-service:v1.2.1`, so a local authSDK checkout is optional.
- Use `docker compose -f docker-compose.yml -f docker-compose.authsdk.local.yml up --build` when you want to build authSDK from `AUTHSDK_PATH` instead of pulling from GHCR.
- `AUTHSDK_PATH` defaults to `../authSDK-1.1.0` and is only used by `docker-compose.authsdk.local.yml`.
- Adminer connection values:
  - TWA app DB -> System `PostgreSQL`, Server `twa-postgres`, Username `twa`, Password `twa`, Database `twa`
  - authSDK DB -> System `PostgreSQL`, Server `auth-postgres`, Username `postgres`, Password any value, Database `auth_service`
  - The authSDK Postgres container uses trust auth locally, so Adminer may still require text in the password box even though Postgres does not validate it.
- `twa-backend` runs `alembic upgrade head` on container startup so migrations stay applied.
- `shared/frontend/` contains the shared frontend design tokens, primitives, auth client, and route-guard layer used by all three apps.
- Frontend auth requests should use the same-origin `/_auth` path and rely on the Vite proxy target instead of calling `http://localhost:8000` directly from the browser. This keeps the public `/auth` SPA route free for the app itself.
- Run `npm install` from the repo root once so shared frontend imports can resolve React and router packages from the workspace root.
- The current backend migration chain starts with a bootstrap revision and the first real schema revision.
- FastAPI Swagger UI is available at `/docs`, and ReDoc is available at `/redoc`.
- TWA email notifications use `TWA_SMTP_HOST`, `TWA_SMTP_PORT`, `TWA_SMTP_TIMEOUT_SECONDS`, `TWA_EMAIL_FROM`, and `TWA_NOTIFICATION_EMAIL_ENABLED`. The defaults are already set up for local MailHog.
- When you use the full Docker workflow with the local authSDK override, rebuild with `docker compose -f docker-compose.yml -f docker-compose.authsdk.local.yml up --build` after source changes so containers pick up new authSDK code.
- Run `uv run python -m app.db.seed` after migrations if you want the default notification config and an optional staff bootstrap user.
- `backend/pyproject.toml` pins `auth-service-sdk` to the official `authSDK` GitHub source for `v1.1.0`, so backend installs and CI do not rely on a sibling SDK checkout.
- Transit accessibility uses the official Metro St. Louis GTFS feed at `https://www.metrostlouis.org/Transit/google_transit.zip`, stored locally at `backend/data/metro_stl_gtfs.zip`.
