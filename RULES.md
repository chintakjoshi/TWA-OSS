# RULES

This document defines the baseline engineering and design rules for TWA. These are not optional preferences. They are the default standards for production-quality work in this repository.

## Product Mindset

- Build for correctness first, then clarity, then speed.
- Favor simple, maintainable solutions over clever shortcuts.
- Optimize for a stable pilot-ready product, not demo-only behavior.
- Leave the codebase easier to extend than you found it.

## General Coding Standards

- Keep functions and components focused on one job.
- Prefer explicit naming over abbreviations.
- Avoid hidden side effects and surprising behavior.
- Use type-safe code paths and validate input at boundaries.
- Remove dead code, starter code, and unused assets instead of leaving them behind.
- Do not commit secrets, tokens, private keys, or local credentials.
- Do not hardcode environment-specific values when configuration belongs in env vars.

## Backend Rules

- Keep route handlers thin. Put business logic in services, not directly in routers.
- Use Pydantic schemas for request and response contracts.
- Keep database access behind clear model and service boundaries.
- Any schema change must ship with an Alembic migration.
- Enforce auth and role checks on the server, never only in the frontend.
- Treat audit logging as part of the feature for sensitive state changes.
- Use structured errors and avoid leaking internal stack details to clients.
- Prefer idempotent operations where retries are realistic.

## Database And Data Rules

- Model states explicitly. Do not overload one column to mean multiple lifecycle concepts.
- Add timestamps consistently for created and updated records.
- Be deliberate about nullability, defaults, and uniqueness constraints.
- Protect data integrity with database constraints, not only application logic.
- Keep personally sensitive data exposure intentional and documented.

## API Rules

- Keep API behavior consistent across endpoints.
- Use versioned routes for application APIs.
- Return predictable error shapes and status codes.
- Avoid breaking API changes without updating docs and dependent clients.
- Keep Swagger and OpenAPI accurate enough to be useful during integration.

## Security Rules

- Apply least privilege to roles and access checks.
- Validate and sanitize all external input.
- Never trust client-provided authorization context.
- Keep authentication separate from local app authorization decisions.
- Be careful with justice-involved and employment-related data because privacy mistakes are high-impact.

## Testing And Quality Rules

- New behavior should include tests unless there is a strong reason not to.
- Bug fixes should include regression coverage when practical.
- Do not merge code that has not been exercised locally in some meaningful way.
- Prefer small, verifiable changes over large risky rewrites.
- If a feature changes setup, behavior, or contracts, update the docs in the same change.

## Observability And Operations Rules

- Log meaningful events, not noise.
- Make failures diagnosable without exposing secrets.
- Use health checks for services that are expected to run in Docker or production.
- Favor graceful degradation for external dependency failures where possible.
- Treat migrations, seed behavior, and startup dependencies as first-class operational concerns.

## Frontend And Design Rules

- Preserve a consistent visual system across the three apps.
- Design for desktop and mobile from the start.
- Use clear hierarchy, spacing, and typography instead of crowded screens.
- Every screen should handle loading, empty, success, and error states.
- Keep forms accessible, labeled, and validation-friendly.
- Respect color contrast, keyboard navigation, and visible focus states.
- Prefer reusable UI primitives over one-off styling when patterns repeat.
- Do not hide important status information behind ambiguous icons or vague labels.
- Avoid generic template-looking interfaces when a clearer, more intentional design is possible.
- New UI should feel trustworthy, calm, and operationally clear.

## Design Best Practices For This App

- Staff workflows should prioritize scanability, filtering, and status clarity.
- Jobseeker screens should reduce confusion and avoid exposing private rejection reasoning.
- Employer screens should communicate review status and next actions plainly.
- Use badges, tables, alerts, and forms intentionally instead of decorating every surface.
- Keep destructive actions explicit and confirmable.
- Prefer design tokens and shared variables over scattered hardcoded values.

## Collaboration Rules

- Do not overwrite or revert unrelated work without explicit approval.
- Explain non-obvious tradeoffs in PRs, issues, or docs.
- If you make an assumption, document it when it affects architecture or behavior.
- Keep documentation, implementation, and contracts in sync.

## Decision Rule

When in doubt, choose the path that improves reliability, readability, security, accessibility, and operational clarity or simply ask questions.