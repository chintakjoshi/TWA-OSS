# Contributing To TWA

Thanks for helping improve TWA. This repo includes a FastAPI backend, three React frontends, and shared frontend code, so good contributions usually touch code, tests, and docs together.

## Before You Start

- Read the root [README.md](README.md) for quick orientation.
- Use [docs/README.md](docs/README.md) to find the right setup or reference guide.
- Follow the standards in [docs/reference/engineering-rules.md](docs/reference/engineering-rules.md).
- Review the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local Setup

Use the setup guide in [docs/local-development.md](docs/local-development.md). The short version is:

```powershell
Copy-Item .env.example .env
docker compose up
```

If you prefer running code on the host, the local development guide includes the backend, frontend, and authSDK workflow as well.

## Development Expectations

- Keep route handlers thin and put business logic in services.
- Ship schema changes with Alembic migrations.
- Update docs when setup, behavior, API contracts, or workflows change.
- Avoid unrelated cleanup in the same change unless it is directly needed.
- Do not commit secrets, local credentials, or environment-specific artifacts.

## Quality Checks

Run backend checks:

```powershell
cd backend
uv run ruff check .
uv run black --check .
uv run pytest
```

Run frontend checks from the repo root:

```powershell
npm run lint:frontend
npm run test:frontend
npm run format:check
```

Verify each frontend app builds when your change affects UI behavior:

```powershell
cd frontend\jobseeker; npm run build
cd ..\employer; npm run build
cd ..\admin; npm run build
```

## Pull Requests

When opening a PR:

- describe what changed and why
- call out user-facing behavior changes
- mention any follow-up work or known gaps
- include test coverage or manual verification notes
- include doc updates when the change affects usage, setup, or architecture

Small, focused PRs are easier to review and safer to merge.

## Reporting Bugs Or Ideas

- Search existing issues first.
- Open a new issue with clear reproduction steps or a clear enhancement proposal.
- Include logs, screenshots, API responses, or environment notes when they help narrow the problem quickly.

## Questions And Collaboration

If something is unclear, open an issue or ask in the project discussion channel that your team uses. Clear questions early are better than avoidable churn later.
