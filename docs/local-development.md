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
- `mailhog`: local SMTP capture and email viewer

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

- `AUTHSDK_PATH` defaults to `../authSDK-1.0.2/authSDK-1.0.2`, which matches the current local desktop layout.
- `twa-backend` runs `alembic upgrade head` on container startup so migrations stay applied.
- The current backend migration chain starts with a bootstrap revision and the first real schema revision.
- FastAPI Swagger UI is available at `/docs`, and ReDoc is available at `/redoc`.
- When you use the full Docker workflow, rebuild with `docker compose up --build` after source changes so containers pick up new code.
- Run `uv run python -m app.db.seed` after migrations if you want the default notification config and an optional staff bootstrap user.
- `backend/pyproject.toml` resolves `auth-service-sdk` from the sibling `authSDK-1.0.2/sdk` checkout via `tool.uv.sources`, so local backend installs use the fixed SDK packaging directly.
