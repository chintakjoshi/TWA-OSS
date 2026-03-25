# TWA App - Project Specification

This document captures the product and business-rule reference for TWA. Use it as the high-level product spec; use `api-contract.md` for endpoint details and the docs index for current setup guidance.

## Overview

A web application for Saint Louis University's Transformative Workforce Academy (TWA) that connects justice-involved jobseekers with fair-chance employers. The app supports two-way matching between jobseekers and job listings, manages employer and jobseeker onboarding, and provides TWA staff with tools to review, approve, and track placements.

---

## Background

TWA connects justice-involved individuals with fair-chance employers in Missouri. The app needs to:

- Allow jobseekers to self-register, build a profile, browse jobs, and apply
- Allow employers to self-register and submit job listings for staff review
- Give TWA staff a full admin panel to manage approvals, run matching in both directions, and track placements
- Factor in transportation access and self-reported criminal charge categories as the core matching criteria

---

## Users and Roles

### 1. Jobseeker (public-facing portal)

- Justice-involved individuals referred to or self-directed to TWA
- Self-register through the auth service, verify email, then login and bootstrap into the TWA app
- Fill out a profile including location, transportation type, and self-reported charge categories
- Browse all active job listings with eligibility indicated per listing
- Apply to jobs through the app
- Can be marked as hired by a specific employer

### 2. Employer (public-facing portal, limited)

- Organizations willing to hire fair-chance candidates
- Self-register through the auth service, verify email, then login and bootstrap into the TWA app
- Employer account goes into a pending state until approved by TWA staff
- Once approved, can submit job listing requests for staff review
- Can view the status of their submitted listings

### 3. TWA Staff (internal admin panel)

- Manage employer account approval queue
- Manage job listing review and approval queue
- Manage jobseeker profiles
- Run two-way matching (jobseeker to jobs, job to jobseekers)
- Track applications and mark jobseekers as hired
- Configure notification settings
- View full audit log

---

## Three Interfaces, One Backend

| Interface         | Audience   | Access                                                                                     |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Jobseeker Portal  | Jobseekers | Public, requires auth-service signup + email verification + TWA bootstrap                  |
| Employer Portal   | Employers  | Public, requires auth-service signup + email verification + TWA bootstrap + staff approval |
| Staff Admin Panel | TWA staff  | Internal, staff-created local app accounts tied to auth identities                         |

All three frontends share one TWA backend API and one external auth service.

---

## Tech Stack

| Layer            | Choice                                                            |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React + Tailwind CSS                                              |
| Backend          | Python (FastAPI)                                                  |
| Database         | PostgreSQL                                                        |
| Auth Service     | `authSDK` (`Desktop/authSDK` / `github.com/chintakjoshi/authSDK`) |
| Auth Integration | `auth-service-sdk` middleware in the TWA backend                  |
| Hosting          | Railway or Render (suggested starting point)                      |

All three frontends share one backend API. Authentication is handled by `authSDK`, while TWA-specific roles and business authorization are handled by the TWA backend.

---

## Authentication Architecture

Use `authSDK` unchanged as the centralized authentication authority.

### Responsibilities of `authSDK`

- Signup and login
- JWT access and refresh token issuance
- Session validation
- Logout
- Email verification
- Password reset
- OTP and other auth lifecycle features

### Responsibilities of the TWA Backend

- Bootstrap an authenticated auth user into a local TWA app user
- Store the real TWA app role: `jobseeker`, `employer`, or `staff`
- Enforce TWA-specific authorization rules
- Store all TWA business data
- Manage profile completion, approvals, listings, applications, matching, notifications, and audit history

### Production Flow

1. Frontend calls `authSDK` directly for signup
2. `authSDK` sends an email verification link and the user must complete verification before password login
3. Frontend calls `authSDK` for login
4. `authSDK` issues an access token with audience `twa-api`
5. Frontend calls the TWA backend with that bearer token
6. TWA validates the token using `auth-service-sdk`
7. TWA resolves or creates the local app user using `auth_user_id`
8. TWA authorizes access using the local app role, not the auth-provider role in the token

---

## Project Structure

```text
TWA-OSS/
  backend/
    app/
      routers/         # auth bootstrap, jobseekers, employers, jobs, applications, admin, notifications
      models/          # SQLAlchemy models
      schemas/         # Pydantic schemas
      services/        # matching logic, auth context, notification dispatch
      audit/           # audit log writer and reader
    main.py
  frontend/
    jobseeker/         # React app for jobseekers
    employer/          # React app for employers
    admin/             # React app for TWA staff
  shared/              # shared Tailwind config, design tokens, reusable components
```

---

## Database Schema (PostgreSQL)

```sql
-- Local TWA app users. These map authenticated authSDK users into TWA roles.
app_users (
  id UUID PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL,                 -- user id from authSDK token subject
  email TEXT NOT NULL,
  auth_provider_role TEXT NOT NULL,                  -- e.g. 'user', 'admin', 'service' from authSDK
  app_role TEXT CHECK (app_role IN ('jobseeker', 'employer', 'staff')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
)

-- Jobseeker profiles (one-to-one with local app_users)
jobseekers (
  id UUID PRIMARY KEY,
  app_user_id UUID REFERENCES app_users(id),
  full_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  transit_type TEXT CHECK (transit_type IN ('own_car', 'public_transit', 'both')),
  charge_sex_offense BOOLEAN DEFAULT FALSE,
  charge_violent BOOLEAN DEFAULT FALSE,
  charge_armed BOOLEAN DEFAULT FALSE,
  charge_children BOOLEAN DEFAULT FALSE,
  charge_drug BOOLEAN DEFAULT FALSE,
  charge_theft BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('active', 'hired')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Employer profiles (one-to-one with local app_users)
employers (
  id UUID PRIMARY KEY,
  app_user_id UUID REFERENCES app_users(id),
  org_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  review_note TEXT,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Job listings
job_listings (
  id UUID PRIMARY KEY,
  employer_id UUID REFERENCES employers(id),
  title TEXT NOT NULL,
  description TEXT,
  location_address TEXT,
  city TEXT,
  zip TEXT,
  transit_required TEXT CHECK (transit_required IN ('own_car', 'any')) DEFAULT 'any',
  disq_sex_offense BOOLEAN DEFAULT FALSE,
  disq_violent BOOLEAN DEFAULT FALSE,
  disq_armed BOOLEAN DEFAULT FALSE,
  disq_children BOOLEAN DEFAULT FALSE,
  disq_drug BOOLEAN DEFAULT FALSE,
  disq_theft BOOLEAN DEFAULT FALSE,
  transit_accessible BOOLEAN,
  job_lat FLOAT,
  job_lon FLOAT,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  lifecycle_status TEXT CHECK (lifecycle_status IN ('open', 'closed')) DEFAULT 'open',
  review_note TEXT,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Applications
applications (
  id UUID PRIMARY KEY,
  jobseeker_id UUID REFERENCES jobseekers(id),
  job_listing_id UUID REFERENCES job_listings(id),
  status TEXT CHECK (status IN ('submitted', 'reviewed', 'hired')) DEFAULT 'submitted',
  applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
)

-- Notification config (single row, staff-managed)
notification_config (
  id INT PRIMARY KEY DEFAULT 1,
  notify_staff_on_apply BOOLEAN DEFAULT TRUE,
  notify_employer_on_apply BOOLEAN DEFAULT FALSE,
  share_applicants_with_employer BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP
)

-- Audit log
audit_log (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES app_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
)
```

---

## Matching Logic

The matching engine lives in `backend/app/services/matching.py` and handles both directions.

### Eligibility Rules

A jobseeker is eligible for a job listing if ALL of the following are true:

1. **Charge compatibility**: None of the jobseeker's self-reported charge flags overlap with the listing's disqualifying charge flags.
2. **Transportation compatibility**:
   - If the listing requires `own_car` and the jobseeker's transit type is `public_transit`, they are ineligible.
   - If the jobseeker's transit type is `public_transit`, jobs located outside the St. Louis City/County public transit reach are ineligible.

### Transit Accessibility

Rather than maintaining a hardcoded list of excluded zip codes, transit accessibility is computed dynamically using the official Metro St. Louis GTFS open data feed and stored as a `transit_accessible` boolean on each job listing.

A job location is considered transit-accessible if at least one Metro transit stop exists within 0.5 miles of the job address. This radius is configurable.

### Matching Functions

```python
# backend/app/services/matching.py

def get_eligible_jobs_for_jobseeker(jobseeker_id: UUID) -> list[JobWithEligibility]:
    """
    Returns all approved, open job listings.
    Each listing includes an is_eligible flag computed from charge and transit rules.
    """

def get_eligible_jobseekers_for_job(job_listing_id: UUID) -> list[JobseekerWithEligibility]:
    """
    Returns all active jobseekers.
    Each jobseeker includes an is_eligible flag computed from the same rules in reverse.
    """
```

Both functions return all records, not just eligible ones, so the UI can show the full list with eligibility indicated.

The response shape for each listing should include:

```python
class JobWithEligibility:
    job: JobListing
    is_eligible: bool
    ineligibility_tag: str | None
```

The `ineligibility_tag` is distance-based only. Charge incompatibility is never surfaced as a reason to the jobseeker.

---

## API Surface

```text
# External auth service (`authSDK`)
POST   {AUTH_BASE_URL}/auth/signup         # create auth identity
GET    {AUTH_BASE_URL}/auth/verify-email   # verify email from the auth-service link
POST   {AUTH_BASE_URL}/auth/verify-email/resend/request  # resend verification email without a session
POST   {AUTH_BASE_URL}/auth/login          # login with audience=twa-api
POST   {AUTH_BASE_URL}/auth/token          # refresh token
POST   {AUTH_BASE_URL}/auth/logout         # logout
GET    {AUTH_BASE_URL}/auth/validate       # token/session validation for SDK
GET    {AUTH_BASE_URL}/.well-known/jwks.json

# TWA local auth context
POST   /api/v1/auth/bootstrap              # assign local TWA app role after auth-service verification + login
GET    /api/v1/auth/me                     # current local app auth context

# Jobseeker portal
GET    /api/v1/jobs                        # all active listings with eligibility for logged-in jobseeker
GET    /api/v1/jobs/{id}                   # job detail
PATCH  /api/v1/jobseekers/me              # create/update jobseeker profile
GET    /api/v1/jobseekers/me              # get jobseeker profile
POST   /api/v1/applications               # jobseeker submits application
GET    /api/v1/applications/me            # current user's applications

# Employer portal
GET    /api/v1/employers/me                                # employer profile and approval state
PATCH  /api/v1/employers/me                               # update employer profile
POST   /api/v1/employer/listings                          # submit job listing for review
GET    /api/v1/employer/listings                          # view own listings and their statuses
GET    /api/v1/employer/listings/{id}                     # view single listing
GET    /api/v1/employer/listings/{id}/applicants          # view applicants for a listing when sharing is enabled

# Staff admin
GET    /api/v1/admin/dashboard                            # summary metrics
GET    /api/v1/admin/queue/employers                      # pending employer registrations
PATCH  /api/v1/admin/employers/{id}                       # approve or reject employer account
GET    /api/v1/admin/employers                            # all employers
GET    /api/v1/admin/queue/listings                       # pending job listing reviews
PATCH  /api/v1/admin/listings/{id}                        # approve, reject, or close listing
GET    /api/v1/admin/listings                             # all listings
GET    /api/v1/admin/match/jobseeker/{id}                 # jobs matched to a specific jobseeker
GET    /api/v1/admin/match/listing/{id}                   # jobseekers matched to a specific listing
GET    /api/v1/admin/jobseekers                           # list and search all jobseekers
GET    /api/v1/admin/jobseekers/{id}                      # full jobseeker view
PATCH  /api/v1/admin/jobseekers/{id}                      # edit jobseeker profile
GET    /api/v1/admin/applications                         # application tracker
PATCH  /api/v1/admin/applications/{id}                    # update application status, mark as hired
GET    /api/v1/admin/config/notifications                 # get config toggles
PATCH  /api/v1/admin/config/notifications                 # update config toggles
GET    /api/v1/admin/audit-log                            # filterable audit log

# In-app notifications
GET    /api/v1/notifications/me                           # current user's notifications
PATCH  /api/v1/notifications/me/{id}/read                # mark notification read
```

---

## Audit Log

Every write operation must call a shared `write_audit()` function before committing the database change. This includes:

- Employer account approval or rejection
- Job listing approval, rejection, or closure
- Jobseeker profile edits
- Application status changes
- Notification config changes
- Any staff action that modifies a record
- System actions such as GTFS refresh jobs

```python
def write_audit(
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    old_value: dict | None,
    new_value: dict | None,
):
    ...
```

The `old_value` and `new_value` fields are stored as JSONB so they can hold any shape of record snapshot.

Staff can query the audit log in the admin panel filtered by:

- Actor
- Entity type
- Entity ID
- Date range

---

## Notification Settings

A single config record controlled by TWA staff with three independent toggles:

| Setting                            | Default | Description                                                                                                                        |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Notify staff on apply              | ON      | Staff receives a notification when a jobseeker submits an application                                                              |
| Notify employer on apply           | OFF     | Employer receives a notification when a jobseeker applies to their listing                                                         |
| Share applicant info with employer | OFF     | When ON, employers can see which jobseekers have applied to their listings. When OFF, applicant data is visible only to TWA staff. |

Staff can toggle these at any time from the admin panel. Changes are recorded in the audit log.

### Employer Applicant Visibility

When the "share applicant info with employer" toggle is OFF, the employer portal shows no applicant data at all, only listing statuses. When the toggle is ON, employers can see full applicant profiles for their own listings, including charge-category fields, based on the clarified business requirement.

---

## UI Screens by Interface

### Jobseeker Portal

| Screen          | Description                                                                                                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup / Login  | Frontend uses `authSDK` for signup, email verification, login, password reset, and auth lifecycle                                                                                                                                                                |
| Bootstrap       | Choose or confirm local TWA role if needed                                                                                                                                                                                                                       |
| Profile Setup   | Location, transit type, charge categories, with sensitivity messaging                                                                                                                                                                                            |
| Job Board       | All active listings; each card shows role, employer, location, transit requirement, and a simple eligibility tag. Ineligible listings show a distance tag rather than a detailed reason. No charge-based ineligibility reason is ever surfaced to the jobseeker. |
| Job Detail      | Full listing details, apply button disabled if not eligible                                                                                                                                                                                                      |
| My Applications | List of submitted applications and their statuses                                                                                                                                                                                                                |

### Employer Portal

| Screen                   | Description                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup / Login           | Frontend uses `authSDK` for signup, email verification, login, password reset, and auth lifecycle                                                         |
| Bootstrap                | Create local employer app record after auth-service verification/login                                                                                    |
| Dashboard                | Status of employer account (pending / approved / rejected)                                                                                                |
| Submit Job Listing       | Title, description, location, transit requirement, disqualifying charge categories                                                                        |
| My Listings              | All submitted listings with review and lifecycle statuses                                                                                                 |
| Applicants (conditional) | Only visible if TWA staff has enabled applicant sharing. Shows applicants per listing, including charge-category fields under the current business rules. |

### Staff Admin Panel

| Screen                | Description                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Dashboard             | Summary counts: pending employer approvals, pending listing reviews, active jobseekers, open applications |
| Employer Queue        | List of pending employer registrations; approve or reject with optional note                              |
| Employer List         | All employers, filterable by status                                                                       |
| Listing Queue         | Pending job listings awaiting review; approve, reject, or request changes                                 |
| Listing Manager       | All listings, filterable by status, employer, location                                                    |
| Jobseeker List        | All jobseekers, filterable by status, charge categories, transit type                                     |
| Jobseeker Profile     | Full profile view and edit; see applications; mark as hired                                               |
| Match: Jobseeker View | Select a jobseeker, see all jobs with eligibility indicated                                               |
| Match: Listing View   | Select a listing, see all jobseekers with eligibility indicated                                           |
| Application Tracker   | All applications across all jobseekers; update status; mark as hired                                      |
| Notification Config   | Toggle staff and employer notification settings                                                           |
| Audit Log             | Searchable, filterable log of all staff actions                                                           |

---

## Build Order

Build in this sequence to keep dependencies clean:

1. Database setup and SQLAlchemy models
2. Auth integration: connect TWA backend to `authSDK`, add JWT middleware, add local app-user bootstrap and role guards
3. GTFS data pipeline: download feed, parse stops, build transit accessibility checker
4. Employer auth-service signup, email verification, local bootstrap, and approval flow
5. Job listing submission and staff review queue; geocode address and compute `transit_accessible` at creation
6. Jobseeker auth-service signup, email verification, local bootstrap, and profile setup
7. Job board with eligibility indicators and distance tags
8. Application submission and notification dispatch
9. Two-way matching views in the admin panel
10. Hired status tracking and placement marking
11. Audit log writer and admin viewer
12. GTFS refresh background job

---

## Open Items to Confirm with TWA Director

- No remaining open items. The transit exclusion zone question is resolved via the GTFS-based approach documented in the Transit Data and GTFS Integration section.

---

## Transit Data and GTFS Integration

Transit accessibility for each job listing is determined using the official Metro St. Louis GTFS open data feed. This eliminates the need for a manually maintained zip code exclusion list and automatically reflects real route coverage.

### Data Sources

| Source                           | URL                                               | Format                          |
| -------------------------------- | ------------------------------------------------- | ------------------------------- |
| Metro St. Louis GTFS feed        | https://www.metrostlouis.org/developer-resources/ | GTFS (ZIP containing CSV files) |
| Metro St. Louis Open Data Portal | https://data-metrostl.opendata.arcgis.com         | GeoJSON, CSV, WFS API           |

The GTFS feed covers 60 routes and 5,123 stops including MetroBus, MetroLink light rail, and Metro Call-A-Ride. Download `stops.txt` from the feed; it contains the lat/lon of every stop in the network.

### Required Python Libraries

```bash
pip install gtfs-kit geopy pgeocode shapely apscheduler
```

### Implementation: Transit Accessibility Checker

Create this module at `backend/app/services/transit.py`:

```python
import gtfs_kit as gk
import geopy.distance
import pgeocode
from functools import lru_cache

TRANSIT_WALK_RADIUS_MILES = 0.5

@lru_cache(maxsize=1)
def load_stops():
    feed = gk.read_feed("data/metro_stl_gtfs.zip", dist_units="mi")
    return list(zip(feed.stops["stop_lat"], feed.stops["stop_lon"]))

def is_transit_accessible(job_lat: float, job_lon: float) -> bool:
    stops = load_stops()
    for stop_lat, stop_lon in stops:
        dist = geopy.distance.distance((job_lat, job_lon), (stop_lat, stop_lon)).miles
        if dist <= TRANSIT_WALK_RADIUS_MILES:
            return True
    return False

def get_distance_from_zip(job_lat: float, job_lon: float, jobseeker_zip: str) -> float | None:
    nomi = pgeocode.Nominatim("us")
    result = nomi.query_postal_code(jobseeker_zip)
    if result is None or result.latitude is None:
        return None
    return geopy.distance.distance((job_lat, job_lon), (result.latitude, result.longitude)).miles
```

### Implementation: Geocoding Job Addresses

When a job listing is created or updated for review, geocode the address to get lat/lon and compute `transit_accessible`. Use `geopy` with Nominatim for development. Switch to Google Maps Geocoding API or Mapbox for production accuracy.

```python
from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="twa-app")

def geocode_address(address: str, city: str, zip_code: str):
    full_address = f"{address}, {city}, MO {zip_code}"
    try:
        location = geolocator.geocode(full_address, timeout=10)
        if location:
            return location.latitude, location.longitude
    except Exception:
        pass
    return None, None
```

### GTFS Feed Storage

Store the downloaded GTFS zip at `backend/data/metro_stl_gtfs.zip`. Add this path to `.gitignore` and document the download step in the project README. Do not commit the feed file to the repo.

### GTFS Refresh Background Job

Metro St. Louis updates its GTFS feed when routes change. Create a background job that:

1. Downloads the latest GTFS feed from the Metro STL developer resources page
2. Replaces `backend/data/metro_stl_gtfs.zip`
3. Clears the `load_stops()` LRU cache
4. Re-runs `is_transit_accessible()` for all active listings and updates their `transit_accessible` column
5. Logs the refresh to the audit log under `entity_type = "system"`, `action = "gtfs_feed_refreshed"`

Use APScheduler or a platform cron job to run this monthly.

### Setup Instructions for the Agent

When setting up the project for the first time:

1. Install dependencies: `pip install gtfs-kit geopy pgeocode shapely apscheduler`
2. Create the `backend/data/` directory
3. Download the Metro St. Louis GTFS feed from https://www.metrostlouis.org/developer-resources/ and save it to `backend/data/metro_stl_gtfs.zip`
4. Add `backend/data/metro_stl_gtfs.zip` to `.gitignore`
5. Run the transit accessibility seeder on any existing job listings after initial data load
