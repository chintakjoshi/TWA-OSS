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

- `AUTHSDK_PATH` defaults to `../authSDK-1.0.2`, which matches the current local desktop layout and is only required for the Dockerized auth service.
- `twa-backend` runs `alembic upgrade head` on container startup so migrations stay applied.
- The current backend migration chain starts with a bootstrap revision and the first real schema revision.
- FastAPI Swagger UI is available at `/docs`, and ReDoc is available at `/redoc`.
- TWA email notifications use `TWA_SMTP_HOST`, `TWA_SMTP_PORT`, `TWA_SMTP_TIMEOUT_SECONDS`, `TWA_EMAIL_FROM`, and `TWA_NOTIFICATION_EMAIL_ENABLED`. The defaults are already set up for local MailHog.
- When you use the full Docker workflow, rebuild with `docker compose up --build` after source changes so containers pick up new code.
- Run `uv run python -m app.db.seed` after migrations if you want the default notification config and an optional staff bootstrap user.
- `backend/pyproject.toml` pins `auth-service-sdk` to the official `authSDK` GitHub source for `v1.0.2`, so backend installs and CI do not rely on a sibling SDK checkout.
- Transit accessibility uses the official Metro St. Louis GTFS feed at `https://www.metrostlouis.org/Transit/google_transit.zip`, stored locally at `backend/data/metro_stl_gtfs.zip`.
