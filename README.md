# Transformative Workforce Academy

TWA is a web application for Saint Louis University's Transformative Workforce Academy. It connects justice-involved jobseekers with fair-chance employers and gives TWA staff tools to manage approvals, matching, applications, placements, notifications, and audit history.

## Architecture

- `frontend/jobseeker`: jobseeker-facing React app
- `frontend/employer`: employer-facing React app
- `frontend/admin`: staff admin React app
- `backend`: FastAPI service for all TWA business logic
- `authSDK`: external authentication service used by this app

The TWA backend uses `auth-service-sdk` middleware to trust `authSDK` bearer tokens. TWA-specific roles such as `jobseeker`, `employer`, and `staff` are stored locally in the TWA database.

## Local Setup

1. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

2. Start PostgreSQL locally if needed:

```powershell
docker compose up -d
```

3. Install backend dependencies:

```powershell
cd backend
uv sync
```

4. Install frontend dependencies:

```powershell
cd ..\frontend\jobseeker; npm install
cd ..\employer; npm install
cd ..\admin; npm install
```

5. Run the backend:

```powershell
cd ..\..\backend
uv run uvicorn app.main:app --reload --port 9000
```

6. Run the frontends:

```powershell
cd ..\frontend\jobseeker; npm run dev
cd ..\employer; npm run dev
cd ..\admin; npm run dev
```

Default local URLs:

- Backend: `http://localhost:9000`
- Jobseeker frontend: `http://localhost:5173`
- Employer frontend: `http://localhost:5174`
- Admin frontend: `http://localhost:5175`

## Key Docs

- [project.md](project.md)
- [implementation-guide.md](implementation-guide.md)
- [api-contract.md](api-contract.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [LICENSE](LICENSE)
