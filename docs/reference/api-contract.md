# TWA App - API Contract

## Purpose

This document defines the backend API contract for the TWA app. It is the shared agreement between frontend and backend implementation and supersedes the rough endpoint notes in `project-specification.md` where the two differ.

Key decisions reflected here:

- Base path is `/api/v1`
- `authSDK` is the external authentication authority for signup, login, session refresh, logout, email verification, password reset, and OTP
- The TWA backend does not issue JWTs or validate passwords directly
- The TWA backend stores the real app role: `jobseeker`, `employer`, or `staff`
- Employers can view applicant charge fields when applicant sharing is enabled
- Jobseekers never receive charge-based ineligibility reasons
- Listings use separate `review_status` and `lifecycle_status`
- System audit events may use `actor_id = null`

---

## API Conventions

### Base URL

```text
/api/v1
```

### Content Type

```http
Content-Type: application/json
```

### Authentication

TWA uses `authSDK` as an external auth service.

Production integration model:

- Browser frontends call same-origin `/_auth` routes backed by `authSDK` for signup, login, refresh, logout, password reset, email verification, and OTP
- Frontends must complete authSDK email verification before password login will succeed
- Browser auth uses cookie-backed sessions rather than storing access or refresh tokens in browser storage
- Unsafe browser requests must include the CSRF header expected by the auth and backend middleware
- The TWA backend validates authSDK sessions using `auth-service-sdk` middleware and online session validation
- The TWA backend resolves the local app user from the auth session subject (`sub`) and enforces the local TWA role from its own database
- The auth provider role inside the validated session is not the TWA app role

Protected TWA routes require:

- browser clients: authSDK access cookie plus CSRF header on unsafe requests
- non-browser clients: `Authorization: Bearer <authsdk access token>`

### Timestamps

All timestamps are ISO 8601 UTC strings.

Example:

```json
"2026-03-18T23:15:00Z"
```

### IDs

All resource IDs are UUID strings unless otherwise stated.

### Pagination

List endpoints use:

```text
?page=1&page_size=20
```

Paginated response shape:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 125,
    "total_pages": 7
  }
}
```

### Error Shape

All non-2xx responses should follow:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": {
      "email": ["Email is required."]
    }
  }
}
```

### Common Error Codes

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `ACCOUNT_PENDING_APPROVAL`
- `PROFILE_INCOMPLETE`
- `LOCAL_ROLE_NOT_ASSIGNED`
- `LISTING_NOT_ELIGIBLE`
- `APPLICANT_VISIBILITY_DISABLED`
- `STATE_TRANSITION_NOT_ALLOWED`

---

## Enums

### `UserRole`

This is the TWA-local application role, not the auth provider role.

```json
["jobseeker", "employer", "staff"]
```

### `AuthProviderRole`

This is the role carried inside `authSDK` tokens.

```json
["admin", "user", "service"]
```

### `TransitType`

```json
["own_car", "public_transit", "both"]
```

### `ListingTransitRequirement`

```json
["own_car", "any"]
```

### `EmployerReviewStatus`

```json
["pending", "approved", "rejected"]
```

### `ListingReviewStatus`

```json
["pending", "approved", "rejected"]
```

### `ListingLifecycleStatus`

```json
["open", "closed"]
```

### `ApplicationStatus`

```json
["submitted", "reviewed", "hired"]
```

### `NotificationChannel`

```json
["email", "in_app"]
```

---

## Shared Resource Shapes

### `AuthenticatedAppContext`

```json
{
  "app_user": {
    "id": "5f3e9ca0-4c62-4476-9701-d8dfb09bb201",
    "auth_user_id": "9ebf8dc7-8ec1-4c97-a12f-52e7fb75f548",
    "email": "jane@example.com",
    "auth_provider_role": "user",
    "app_role": "jobseeker",
    "is_active": true,
    "created_at": "2026-03-18T23:15:00Z",
    "updated_at": "2026-03-18T23:15:00Z"
  },
  "profile_complete": true,
  "next_step": null
}
```

### `ChargeFlags`

```json
{
  "sex_offense": false,
  "violent": false,
  "armed": false,
  "children": false,
  "drug": true,
  "theft": false
}
```

### `JobseekerProfile`

```json
{
  "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
  "app_user_id": "5f3e9ca0-4c62-4476-9701-d8dfb09bb201",
  "auth_user_id": "9ebf8dc7-8ec1-4c97-a12f-52e7fb75f548",
  "full_name": "Jane Doe",
  "phone": "3145550101",
  "address": "123 Main St",
  "city": "St. Louis",
  "zip": "63103",
  "transit_type": "public_transit",
  "charges": {
    "sex_offense": false,
    "violent": false,
    "armed": false,
    "children": false,
    "drug": true,
    "theft": false
  },
  "profile_complete": true,
  "status": "active",
  "created_at": "2026-03-18T23:15:00Z",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

### `EmployerProfile`

```json
{
  "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
  "app_user_id": "6b8ca13d-6c89-447e-bc80-8f35c406e9c4",
  "auth_user_id": "0bc43a5d-1a57-4bc2-8a5e-f2c57f1199f9",
  "org_name": "Northside Logistics",
  "contact_name": "Sam Carter",
  "phone": "3145550199",
  "address": "500 Market St",
  "city": "St. Louis",
  "zip": "63101",
  "review_status": "pending",
  "review_note": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "2026-03-18T23:15:00Z",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

### `JobListing`

```json
{
  "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
  "employer_id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
  "title": "Warehouse Associate",
  "description": "Loading, unloading, and inventory assistance.",
  "location_address": "2000 North Broadway",
  "city": "St. Louis",
  "zip": "63102",
  "transit_required": "any",
  "disqualifying_charges": {
    "sex_offense": false,
    "violent": false,
    "armed": false,
    "children": false,
    "drug": false,
    "theft": true
  },
  "transit_accessible": true,
  "job_lat": 38.6351,
  "job_lon": -90.1885,
  "review_status": "approved",
  "lifecycle_status": "open",
  "review_note": null,
  "reviewed_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
  "reviewed_at": "2026-03-18T23:15:00Z",
  "created_at": "2026-03-18T23:15:00Z",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

### `JobListingWithEligibility`

```json
{
  "job": {
    "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "title": "Warehouse Associate",
    "city": "St. Louis",
    "transit_required": "any",
    "transit_accessible": true,
    "review_status": "approved",
    "lifecycle_status": "open"
  },
  "is_eligible": false,
  "ineligibility_tag": "14.2 miles from your zip code"
}
```

### `Application`

```json
{
  "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
  "jobseeker_id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
  "job_listing_id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
  "status": "submitted",
  "applied_at": "2026-03-18T23:15:00Z",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

### `NotificationConfig`

```json
{
  "notify_staff_on_apply": true,
  "notify_employer_on_apply": false,
  "share_applicants_with_employer": false,
  "updated_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

### `AuditLogEntry`

```json
{
  "id": "ba2cdd31-986f-4e11-a5a2-7ef1d3322f65",
  "actor_id": null,
  "action": "gtfs_feed_refreshed",
  "entity_type": "system",
  "entity_id": null,
  "old_value": null,
  "new_value": {
    "listings_recomputed": 42
  },
  "timestamp": "2026-03-18T23:15:00Z"
}
```

---

## Authentication Integration

### Production Boundary

Authentication is split between two systems:

- `authSDK` handles credentialed auth and browser session lifecycle
- The TWA backend handles local user bootstrap, local app roles, profile state, and all app authorization decisions

The frontend should talk to `authSDK` through same-origin `/_auth` routes for login-related actions. The TWA backend should never proxy raw passwords unless there is a very specific gateway requirement later.

### External `authSDK` Endpoints

These endpoints are not implemented by the TWA backend. They are part of the deployed auth service and are typically reached from browser clients through same-origin `/_auth`.

### `POST {AUTH_BASE_URL}/auth/signup`

Creates an auth identity.

#### Request Body

```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

#### Notes

- This creates the auth identity only
- It does not assign the TWA app role
- It returns `email_verified: false` for new password signups
- After signup, the client should complete `GET {AUTH_BASE_URL}/auth/verify-email`, then login, then call `POST /api/v1/auth/bootstrap`

### `GET {AUTH_BASE_URL}/auth/verify-email`

Marks the auth identity email as verified from the emailed verification link.

#### Notes

- This does not log the user in
- After verification, the client must still call `POST {AUTH_BASE_URL}/auth/login`

### `POST {AUTH_BASE_URL}/auth/verify-email/resend/request`

Requests a fresh verification email without requiring an authenticated session.

#### Request Body

```json
{
  "email": "jane@example.com"
}
```

#### Notes

- Returns `200 {"sent": true}` for unknown, verified, and unverified emails
- The client should use this after `email_not_verified` or when a user says they did not receive the original email

### `POST {AUTH_BASE_URL}/auth/login`

Authenticates the user through `authSDK`.

#### Request Body

```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!",
  "audience": "twa-api"
}
```

#### Response

Defined by `authSDK`, not by the TWA backend contract. For browser clients, the normal success path establishes a cookie-backed session instead of returning browser-managed access and refresh tokens.

#### Policy Note

- When the verified-email login policy is enabled, correct credentials for an unverified account return `400 {"detail":"Email is not verified.","code":"email_not_verified"}`
- No authenticated browser session is established in that branch

### `POST {AUTH_BASE_URL}/auth/token`

Refreshes the authenticated authSDK session.

### `POST {AUTH_BASE_URL}/auth/logout`

Logs the user out through `authSDK` and clears the browser session cookies.

### `GET {AUTH_BASE_URL}/auth/validate`

Used by `auth-service-sdk` middleware for session validation.

### `GET {AUTH_BASE_URL}/auth/csrf`

Returns the CSRF token that browser clients echo on unsafe requests while using cookie-backed sessions.

### `GET {AUTH_BASE_URL}/.well-known/jwks.json`

Used by `auth-service-sdk` middleware for JWT verification.

### TWA Local Auth Endpoints

## `POST /api/v1/auth/bootstrap`

Creates or returns the local TWA app user for an already authenticated `authSDK` user.

This is the first TWA-specific call after successful email verification and successful session login.

### Auth

Any authenticated `authSDK` end user with audience `twa-api`.

### Request Body

Jobseeker example:

```json
{
  "role": "jobseeker"
}
```

Employer example:

```json
{
  "role": "employer",
  "employer_profile": {
    "org_name": "Northside Logistics",
    "contact_name": "Sam Carter",
    "phone": "3145550199"
  }
}
```

### Rules

- Public users may bootstrap only `jobseeker` or `employer`
- Bootstrap is idempotent for the same authenticated user
- A public user cannot switch from `jobseeker` to `employer` or vice versa after bootstrap without staff intervention
- Staff accounts are created internally, not through this endpoint

### Response `200 OK`

```json
{
  "app_user": {
    "id": "5f3e9ca0-4c62-4476-9701-d8dfb09bb201",
    "auth_user_id": "9ebf8dc7-8ec1-4c97-a12f-52e7fb75f548",
    "email": "jane@example.com",
    "auth_provider_role": "user",
    "app_role": "jobseeker",
    "is_active": true
  },
  "next_step": "complete_jobseeker_profile"
}
```

Employer bootstrap response example:

```json
{
  "app_user": {
    "id": "6b8ca13d-6c89-447e-bc80-8f35c406e9c4",
    "auth_user_id": "0bc43a5d-1a57-4bc2-8a5e-f2c57f1199f9",
    "email": "hiring@northside.com",
    "auth_provider_role": "user",
    "app_role": "employer",
    "is_active": true
  },
  "next_step": "await_staff_approval"
}
```

### Possible Errors

- `409 CONFLICT` if an existing local role conflicts with the requested bootstrap role
- `403 FORBIDDEN` if the authenticated token is not an end-user token

## `GET /api/v1/auth/me`

Returns the current authenticated auth context plus local TWA app context.

### Auth

Any authenticated `authSDK` user with audience `twa-api`.

### Response `200 OK`

```json
{
  "app_user": {
    "id": "5f3e9ca0-4c62-4476-9701-d8dfb09bb201",
    "auth_user_id": "9ebf8dc7-8ec1-4c97-a12f-52e7fb75f548",
    "email": "jane@example.com",
    "auth_provider_role": "user",
    "app_role": "jobseeker",
    "is_active": true,
    "created_at": "2026-03-18T23:15:00Z",
    "updated_at": "2026-03-18T23:15:00Z"
  },
  "profile_complete": true,
  "employer_review_status": null,
  "next_step": null
}
```

If the user is authenticated in `authSDK` but has not been bootstrapped into TWA yet:

```json
{
  "app_user": null,
  "profile_complete": false,
  "employer_review_status": null,
  "next_step": "bootstrap_role"
}
```

---

## Jobseeker Endpoints

## `GET /api/v1/jobseekers/me`

Returns the logged-in jobseeker profile.

### Auth

`jobseeker`

### Response `200 OK`

```json
{
  "profile": {
    "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
    "full_name": "Jane Doe",
    "phone": "3145550101",
    "address": "123 Main St",
    "city": "St. Louis",
    "zip": "63103",
    "transit_type": "public_transit",
    "charges": {
      "sex_offense": false,
      "violent": false,
      "armed": false,
      "children": false,
      "drug": true,
      "theft": false
    },
    "profile_complete": true,
    "status": "active"
  }
}
```

## `PATCH /api/v1/jobseekers/me`

Creates or updates the logged-in jobseeker profile.

### Auth

`jobseeker`

### Request Body

```json
{
  "full_name": "Jane Doe",
  "phone": "3145550101",
  "address": "123 Main St",
  "city": "St. Louis",
  "zip": "63103",
  "transit_type": "public_transit",
  "charges": {
    "sex_offense": false,
    "violent": false,
    "armed": false,
    "children": false,
    "drug": true,
    "theft": false
  }
}
```

### Response `200 OK`

```json
{
  "profile": {
    "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
    "profile_complete": true,
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/jobs`

Returns all approved, open job listings, including eligibility information for the logged-in jobseeker.

### Auth

`jobseeker`

### Query Parameters

- `page`
- `page_size`
- `search`
- `city`
- `transit_required`
- `is_eligible`

### Response `200 OK`

```json
{
  "items": [
    {
      "job": {
        "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
        "title": "Warehouse Associate",
        "description": "Loading, unloading, and inventory assistance.",
        "location_address": "2000 North Broadway",
        "city": "St. Louis",
        "zip": "63102",
        "transit_required": "any",
        "transit_accessible": true,
        "review_status": "approved",
        "lifecycle_status": "open"
      },
      "is_eligible": false,
      "ineligibility_tag": "14.2 miles from your zip code"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

### Notes

- Charge-based rejection reasons must never be returned here
- The frontend should use `is_eligible` to disable apply

## `GET /api/v1/jobs/{job_id}`

Returns one approved, open job listing for the logged-in jobseeker.

### Auth

`jobseeker`

### Response `200 OK`

```json
{
  "job": {
    "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "title": "Warehouse Associate",
    "description": "Loading, unloading, and inventory assistance.",
    "location_address": "2000 North Broadway",
    "city": "St. Louis",
    "zip": "63102",
    "transit_required": "any",
    "transit_accessible": true,
    "review_status": "approved",
    "lifecycle_status": "open"
  },
  "eligibility": {
    "is_eligible": true,
    "ineligibility_tag": null
  }
}
```

## `POST /api/v1/applications`

Creates an application for the logged-in jobseeker.

### Auth

`jobseeker`

### Request Body

```json
{
  "job_listing_id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2"
}
```

### Response `201 Created`

```json
{
  "application": {
    "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
    "jobseeker_id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
    "job_listing_id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "status": "submitted",
    "applied_at": "2026-03-18T23:15:00Z",
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

### Possible Errors

- `403 PROFILE_INCOMPLETE`
- `409 CONFLICT` if already applied
- `422 LISTING_NOT_ELIGIBLE`

## `GET /api/v1/applications/me`

Returns applications for the logged-in jobseeker.

### Auth

`jobseeker`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
      "status": "submitted",
      "applied_at": "2026-03-18T23:15:00Z",
      "job": {
        "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
        "title": "Warehouse Associate",
        "city": "St. Louis",
        "lifecycle_status": "open"
      }
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

---

## Employer Endpoints

## `GET /api/v1/employers/me`

Returns the logged-in employer profile and review state.

### Auth

`employer`

### Response `200 OK`

```json
{
  "employer": {
    "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
    "org_name": "Northside Logistics",
    "contact_name": "Sam Carter",
    "phone": "3145550199",
    "address": "500 Market St",
    "city": "St. Louis",
    "zip": "63101",
    "review_status": "approved",
    "review_note": null
  }
}
```

## `PATCH /api/v1/employers/me`

Updates the logged-in employer profile.

### Auth

`employer`

### Request Body

```json
{
  "org_name": "Northside Logistics",
  "contact_name": "Sam Carter",
  "phone": "3145550199",
  "address": "500 Market St",
  "city": "St. Louis",
  "zip": "63101"
}
```

### Response `200 OK`

```json
{
  "employer": {
    "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

## `POST /api/v1/employer/listings`

Creates a new listing owned by the logged-in employer.

### Auth

`employer`

### Preconditions

- Employer `review_status` must be `approved`

### Request Body

```json
{
  "title": "Warehouse Associate",
  "description": "Loading, unloading, and inventory assistance.",
  "location_address": "2000 North Broadway",
  "city": "St. Louis",
  "zip": "63102",
  "transit_required": "any",
  "disqualifying_charges": {
    "sex_offense": false,
    "violent": false,
    "armed": false,
    "children": false,
    "drug": false,
    "theft": true
  }
}
```

### Response `201 Created`

```json
{
  "listing": {
    "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "review_status": "pending",
    "lifecycle_status": "open",
    "transit_accessible": true,
    "job_lat": 38.6351,
    "job_lon": -90.1885,
    "created_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/employer/listings`

Returns listings owned by the logged-in employer.

### Auth

`employer`

### Query Parameters

- `page`
- `page_size`
- `review_status`
- `lifecycle_status`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
      "title": "Warehouse Associate",
      "review_status": "approved",
      "lifecycle_status": "open",
      "created_at": "2026-03-18T23:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `GET /api/v1/employer/listings/{listing_id}`

Returns a single listing owned by the logged-in employer.

### Auth

`employer`

### Response `200 OK`

```json
{
  "listing": {
    "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "title": "Warehouse Associate",
    "description": "Loading, unloading, and inventory assistance.",
    "review_status": "approved",
    "lifecycle_status": "open",
    "transit_accessible": true,
    "review_note": null
  }
}
```

## `GET /api/v1/employer/listings/{listing_id}/applicants`

Returns applicants for a listing owned by the logged-in employer.

### Auth

`employer`

### Preconditions

- Listing must belong to the authenticated employer
- `share_applicants_with_employer` must be `true`

### Response `200 OK`

```json
{
  "items": [
    {
      "application_id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
      "status": "submitted",
      "applied_at": "2026-03-18T23:15:00Z",
      "jobseeker": {
        "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
        "full_name": "Jane Doe",
        "phone": "3145550101",
        "address": "123 Main St",
        "city": "St. Louis",
        "zip": "63103",
        "transit_type": "public_transit",
        "charges": {
          "sex_offense": false,
          "violent": false,
          "armed": false,
          "children": false,
          "drug": true,
          "theft": false
        }
      }
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

### Possible Errors

- `403 APPLICANT_VISIBILITY_DISABLED`

---

## Staff Admin Endpoints

## `GET /api/v1/admin/dashboard`

Returns summary metrics for the staff dashboard.

### Auth

`staff`

### Response `200 OK`

```json
{
  "pending_employers": 3,
  "pending_listings": 5,
  "active_jobseekers": 42,
  "open_applications": 16,
  "open_listings": 12
}
```

## `GET /api/v1/admin/queue/employers`

Returns employers pending review.

### Auth

`staff`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
      "org_name": "Northside Logistics",
      "contact_name": "Sam Carter",
      "review_status": "pending",
      "created_at": "2026-03-18T23:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `PATCH /api/v1/admin/employers/{employer_id}`

Updates employer review status.

### Auth

`staff`

### Request Body

```json
{
  "review_status": "approved",
  "review_note": "Approved after manual review."
}
```

### Allowed Transitions

- `pending -> approved`
- `pending -> rejected`
- `rejected -> approved`
- `approved -> rejected`

### Response `200 OK`

```json
{
  "employer": {
    "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
    "review_status": "approved",
    "review_note": "Approved after manual review.",
    "reviewed_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
    "reviewed_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/admin/employers`

Returns all employers with filter support.

### Auth

`staff`

### Query Parameters

- `page`
- `page_size`
- `review_status`
- `search`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
      "org_name": "Northside Logistics",
      "review_status": "approved"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `GET /api/v1/admin/queue/listings`

Returns listings pending review.

### Auth

`staff`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
      "title": "Warehouse Associate",
      "employer": {
        "id": "c61c2014-33e8-4d0e-a7ef-f609d5ab0aeb",
        "org_name": "Northside Logistics"
      },
      "review_status": "pending",
      "lifecycle_status": "open",
      "created_at": "2026-03-18T23:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `PATCH /api/v1/admin/listings/{listing_id}`

Updates listing review state or lifecycle state.

### Auth

`staff`

### Request Body

```json
{
  "review_status": "approved",
  "lifecycle_status": "open",
  "review_note": "Transit check passed."
}
```

Alternative close example:

```json
{
  "lifecycle_status": "closed",
  "review_note": "Closed after hire."
}
```

### Allowed Transitions

- `pending -> approved`
- `pending -> rejected`
- `rejected -> approved`
- `approved -> rejected`
- `open -> closed`

### Response `200 OK`

```json
{
  "listing": {
    "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
    "review_status": "approved",
    "lifecycle_status": "open",
    "review_note": "Transit check passed.",
    "reviewed_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
    "reviewed_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/admin/listings`

Returns all listings with filters.

### Auth

`staff`

### Query Parameters

- `page`
- `page_size`
- `review_status`
- `lifecycle_status`
- `employer_id`
- `city`
- `search`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
      "title": "Warehouse Associate",
      "review_status": "approved",
      "lifecycle_status": "open"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `GET /api/v1/admin/jobseekers`

Returns all jobseekers with filters.

### Auth

`staff`

### Query Parameters

- `page`
- `page_size`
- `search`
- `status`
- `transit_type`
- `charge_sex_offense`
- `charge_violent`
- `charge_armed`
- `charge_children`
- `charge_drug`
- `charge_theft`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
      "full_name": "Jane Doe",
      "city": "St. Louis",
      "zip": "63103",
      "transit_type": "public_transit",
      "status": "active"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `GET /api/v1/admin/jobseekers/{jobseeker_id}`

Returns a full staff view of a jobseeker, including applications.

### Auth

`staff`

### Response `200 OK`

```json
{
  "jobseeker": {
    "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
    "full_name": "Jane Doe",
    "phone": "3145550101",
    "address": "123 Main St",
    "city": "St. Louis",
    "zip": "63103",
    "transit_type": "public_transit",
    "charges": {
      "sex_offense": false,
      "violent": false,
      "armed": false,
      "children": false,
      "drug": true,
      "theft": false
    },
    "status": "active"
  },
  "applications": [
    {
      "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
      "status": "submitted",
      "job_listing_id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2"
    }
  ]
}
```

## `PATCH /api/v1/admin/jobseekers/{jobseeker_id}`

Updates a jobseeker profile as staff.

### Auth

`staff`

### Request Body

```json
{
  "full_name": "Jane Doe",
  "phone": "3145550101",
  "address": "123 Main St",
  "city": "St. Louis",
  "zip": "63103",
  "transit_type": "both",
  "charges": {
    "sex_offense": false,
    "violent": false,
    "armed": false,
    "children": false,
    "drug": true,
    "theft": false
  },
  "status": "active"
}
```

### Response `200 OK`

```json
{
  "jobseeker": {
    "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/admin/match/jobseeker/{jobseeker_id}`

Returns all open, approved listings for a specific jobseeker, including staff-visible eligibility reasons.

### Auth

`staff`

### Response `200 OK`

```json
{
  "items": [
    {
      "job": {
        "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
        "title": "Warehouse Associate",
        "city": "St. Louis"
      },
      "is_eligible": false,
      "ineligibility_reasons": [
        "charge_theft_disqualified",
        "transit_unreachable"
      ]
    }
  ]
}
```

## `GET /api/v1/admin/match/listing/{listing_id}`

Returns all active jobseekers for a specific listing, including staff-visible eligibility reasons.

### Auth

`staff`

### Response `200 OK`

```json
{
  "items": [
    {
      "jobseeker": {
        "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
        "full_name": "Jane Doe",
        "city": "St. Louis"
      },
      "is_eligible": true,
      "ineligibility_reasons": []
    }
  ]
}
```

## `GET /api/v1/admin/applications`

Returns all applications with filters.

### Auth

`staff`

### Query Parameters

- `page`
- `page_size`
- `status`
- `job_listing_id`
- `jobseeker_id`
- `employer_id`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
      "status": "submitted",
      "applied_at": "2026-03-18T23:15:00Z",
      "jobseeker": {
        "id": "8de8d1a0-f72c-4306-b72b-cb4a735de4e1",
        "full_name": "Jane Doe"
      },
      "job": {
        "id": "56d0a9b0-876b-47a9-b84a-4cd80d1fd7e2",
        "title": "Warehouse Associate"
      }
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `PATCH /api/v1/admin/applications/{application_id}`

Updates application status.

### Auth

`staff`

### Request Body

```json
{
  "status": "hired"
}
```

### Allowed Transitions

- `submitted -> reviewed`
- `reviewed -> hired`
- `submitted -> hired`

### Response `200 OK`

```json
{
  "application": {
    "id": "fb6f50c1-8571-48d0-9568-ac22d1f2a8e5",
    "status": "hired",
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

### Notes

- Marking one application as `hired` does not block future applications elsewhere
- Staff may separately close the listing

## `GET /api/v1/admin/config/notifications`

Returns notification settings.

### Auth

`staff`

### Response `200 OK`

```json
{
  "notify_staff_on_apply": true,
  "notify_employer_on_apply": false,
  "share_applicants_with_employer": false,
  "updated_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
  "updated_at": "2026-03-18T23:15:00Z"
}
```

## `PATCH /api/v1/admin/config/notifications`

Updates notification settings.

### Auth

`staff`

### Request Body

```json
{
  "notify_staff_on_apply": true,
  "notify_employer_on_apply": true,
  "share_applicants_with_employer": true
}
```

### Response `200 OK`

```json
{
  "config": {
    "notify_staff_on_apply": true,
    "notify_employer_on_apply": true,
    "share_applicants_with_employer": true,
    "updated_by": "bd29b4dc-bd93-42f8-9d1e-98f2019c13aa",
    "updated_at": "2026-03-18T23:15:00Z"
  }
}
```

## `GET /api/v1/admin/audit-log`

Returns audit entries with filters.

### Auth

`staff`

### Query Parameters

- `page`
- `page_size`
- `actor_id`
- `entity_type`
- `entity_id`
- `action`
- `date_from`
- `date_to`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "ba2cdd31-986f-4e11-a5a2-7ef1d3322f65",
      "actor_id": null,
      "action": "gtfs_feed_refreshed",
      "entity_type": "system",
      "entity_id": null,
      "old_value": null,
      "new_value": {
        "listings_recomputed": 42
      },
      "timestamp": "2026-03-18T23:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

---

## Notification Endpoints

## `GET /api/v1/notifications/me`

Returns in-app notifications for the current user.

### Auth

Any authenticated role.

### Query Parameters

- `page`
- `page_size`
- `unread_only`

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "7db67d92-a43b-4f8f-adb5-335d2d210426",
      "type": "application_submitted",
      "channel": "in_app",
      "title": "New application received",
      "body": "Jane Doe applied to Warehouse Associate.",
      "read_at": null,
      "created_at": "2026-03-18T23:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

## `PATCH /api/v1/notifications/me/{notification_id}/read`

Marks a notification as read.

### Auth

Any authenticated role.

### Response `200 OK`

```json
{
  "notification": {
    "id": "7db67d92-a43b-4f8f-adb5-335d2d210426",
    "read_at": "2026-03-18T23:15:00Z"
  }
}
```

---

## State and Visibility Rules

### Role Resolution

TWA authorization is based on the local TWA app user, not the raw `authSDK` token role.

Authorization flow:

- `authSDK` authenticates the user and establishes a session with audience `twa-api`
- The TWA backend validates the session and reads `sub` as `auth_user_id`
- The TWA backend resolves the local TWA app user by `auth_user_id`
- The TWA backend authorizes routes using the local `app_role`: `jobseeker`, `employer`, or `staff`

### Job Visibility

A job is visible on the jobseeker board only when:

- the caller is authenticated and locally assigned the `jobseeker` role
- `review_status = approved`
- `lifecycle_status = open`

### Application Creation

A jobseeker may apply only when:

- authenticated through `authSDK`
- locally assigned the `jobseeker` role
- profile is complete
- listing is approved and open
- listing is eligible for the jobseeker
- the jobseeker has not already applied to that listing

### Employer Listing Access

An employer may create listings only when:

- authenticated through `authSDK`
- locally assigned the `employer` role
- employer `review_status = approved`

### Staff Access

Staff routes require:

- authenticated through `authSDK`
- locally assigned the `staff` role in the TWA database

### Applicant Visibility

Employers may view applicants only when:

- they own the listing
- staff has enabled `share_applicants_with_employer`

When enabled, the employer receives the full applicant profile including charge fields, based on the clarified business rule.

### Matching Privacy

- Jobseekers never receive charge-based ineligibility reasons
- Staff receives full eligibility reasoning
- Employers do not receive matching screens unless future requirements add them

---

## Audit Requirements

The backend must write audit entries for:

- employer review changes
- listing review changes
- listing closure
- jobseeker edits by staff
- application status changes
- notification config changes
- GTFS refresh and other system maintenance events

Recommended audit action strings:

- `employer_approved`
- `employer_rejected`
- `listing_approved`
- `listing_rejected`
- `listing_closed`
- `jobseeker_updated`
- `application_submitted`
- `application_reviewed`
- `application_hired`
- `notification_config_updated`
- `gtfs_feed_refreshed`

---

## Suggested Router Layout

```text
backend/app/routers/
  auth.py
  jobseekers.py
  jobs.py
  applications.py
  employer.py
  admin.py
  notifications.py
```

---

## Open Implementation Choices

These are not blockers for the contract, but should be decided during implementation:

1. Whether non-browser bearer-token clients should remain a first-class supported integration surface
2. Whether jobseeker profile completion should be one PATCH call or a multi-step wizard
3. Whether in-app notifications should support categories, links, or action buttons
4. Whether staff should be able to reopen closed listings later

---

## Recommended Next Doc

After this contract, the next most useful document is:

- a database schema and migration spec with final tables, constraints, indexes, and audit behavior
