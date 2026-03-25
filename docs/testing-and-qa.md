# Testing And QA

This repo has backend unit and integration coverage, frontend component tests, and CI build verification for all three frontend apps.

## Automated Checks

Run backend linting and tests:

```powershell
cd backend
uv run ruff check .
uv run black --check .
uv run pytest
```

Run shared frontend quality gates from the repo root:

```powershell
npm run lint:frontend
npm run test:frontend
npm run format:check
```

Verify each frontend app builds:

```powershell
cd frontend\jobseeker; npm run build
cd ..\employer; npm run build
cd ..\admin; npm run build
```

## What The Current Tests Cover

Backend coverage includes:

- auth bootstrap and role enforcement
- schema and seed behavior
- employer approval and listing workflows
- jobseeker profile and application workflows
- transit and geocoding service behavior
- matching engine behavior
- notifications and audit logging
- auth-enabled middleware and infrastructure helpers

Frontend coverage includes:

- shared auth console behavior
- route-guard handling
- jobseeker auth and bootstrap transitions
- job board eligibility rendering
- employer listing submission
- admin employer review flows

## CI

GitHub Actions in `.github/workflows/ci.yml` currently runs:

- backend dependency install, Ruff, Black, tests, and import verification
- root frontend dependency install, lint, format check, and Vitest
- separate production builds for the jobseeker, employer, and admin apps

## Manual QA Checklist

Use this checklist before releases or larger merges:

- [ ] Employer signs up through `authSDK`, bootstraps into TWA, waits for approval, gets approved, submits a listing, and staff reviews that listing.
- [ ] Jobseeker signs up through `authSDK`, bootstraps into TWA, completes a profile, sees eligible and ineligible jobs, and submits an application.
- [ ] Staff signs in, reviews applications, marks a hire, and optionally closes the related listing.
- [ ] Employer applicant visibility toggles off and on correctly in the employer portal.
- [ ] Notification settings save correctly in the admin app.
- [ ] Audit log entries appear for employer review, listing review, application updates, and notification-config changes.

## Known Gaps

Scheduled GTFS refresh validation is not covered as a current automated QA workflow in this repo.
