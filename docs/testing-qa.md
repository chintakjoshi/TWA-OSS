# Testing And QA

Phase 15 is now the active quality layer for the repo. Phase 14 background jobs are intentionally skipped for the current implementation, so QA focuses on the live product surface from Phases 1 through 13 plus the new automated coverage added here.

## Automated Checks

Run backend quality and tests:

```powershell
cd backend
uv run ruff check .
uv run black --check .
uv run pytest
```

Run frontend quality, builds, and tests:

```powershell
npm run lint:frontend
npm run test:frontend
npm run format:check

cd frontend\jobseeker; npm run build
cd ..\employer; npm run build
cd ..\admin; npm run build
```

Frontend automated coverage now includes:

- protected route handling through the shared auth guard layer
- authSDK login and signup handoff through the shared auth console
- jobseeker bootstrap transition into the local TWA role flow
- job board eligibility rendering for eligible and ineligible listings
- employer listing submission flow
- admin employer review actions

Backend automated coverage already covered the major workflow phases and now also exercises auth-enabled middleware behavior for protected routes.

## Manual QA Checklist

Use this checklist for local release validation:

- [ ] Employer signs up through `authSDK`, bootstraps into TWA, waits for approval, gets approved, submits a listing, and staff approves that listing.
- [ ] Jobseeker signs up through `authSDK`, bootstraps into TWA, completes a profile, sees both eligible and ineligible jobs, and submits an application.
- [ ] Staff signs in, reviews an application, marks a hire, and optionally closes the related listing.
- [ ] Employer applicant visibility toggles off and on correctly in the employer portal.
- [ ] Audit log records employer review, listing review, application updates, and notification-config changes.

Deferred until Phase 14 is implemented:

- GTFS refresh background-job validation and scheduled-task retry checks.
