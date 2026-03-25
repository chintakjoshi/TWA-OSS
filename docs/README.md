# Documentation

This directory is the home for project documentation beyond the root `README.md`. The goal is to keep the repository entry point short while giving deeper material a stable, predictable place.

## Start Here

- [local-development.md](local-development.md): local setup, Docker workflows, host-based development, and service URLs
- [architecture.md](architecture.md): system boundaries, repo layout, and the major product workflows implemented in the codebase
- [testing-and-qa.md](testing-and-qa.md): automated checks, build verification, and manual QA guidance

## Reference

- [reference/api-contract.md](reference/api-contract.md): backend API contract used by the frontend and backend surfaces
- [reference/project-specification.md](reference/project-specification.md): product scope and business-rule reference
- [reference/engineering-rules.md](reference/engineering-rules.md): repository engineering and design standards

## Community

- [../CONTRIBUTING.md](../CONTRIBUTING.md): contribution workflow and quality expectations
- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md): behavioral expectations for the project
- [../LICENSE](../LICENSE): repository license

## Maintenance Notes

- Keep the root `README.md` focused on orientation and quick start.
- Put durable, project-level guides in `docs/`.
- Put long-lived specifications and contracts in `docs/reference/`.
- When behavior, setup, or API contracts change, update the matching docs in the same change.
