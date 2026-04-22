import type {
  AdminApplication,
  AuthActionOtpRequestResponse,
  AuthActionOtpVerifyResponse,
  AuthAdminSessionDetail,
  AuthAdminSessionFilteredRevokeResponse,
  AuthAdminSessionFilterRevokeInput,
  AuthAdminSessionItem,
  AuthAdminSuspiciousSessionItem,
  AuthAdminSessionRevokeResponse,
  AuthAdminUserDetail,
  AuthAdminUserListItem,
  AuthAdminUserSessionsRevokedResponse,
  AdminDashboard,
  AdminNotification,
  AdminNotificationBulkReadResponse,
  AdminJobseekerDetailResponse,
  ApplicationUpdateInput,
  AuditLogEntry,
  ChargeFlags,
  CursorPageResponse,
  EmployerProfile,
  EmployerReviewInput,
  JobListing,
  JobseekerListItem,
  JobseekerMatchItem,
  JobseekerUpdateInput,
  ListingMatchItem,
  ListingReviewInput,
  NotificationConfig,
  NotificationConfigUpdateInput,
  PaginatedResponse,
} from '../types/admin'

type RequestTwa = <T>(path: string, init?: RequestInit) => Promise<T>
type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

function buildActionHeaders(actionToken?: string) {
  const headers = new Headers()
  if (actionToken) headers.set('X-Action-Token', actionToken)
  return headers
}

export function getDashboard(requestTwa: RequestTwa) {
  return requestTwa<AdminDashboard>('/api/v1/admin/dashboard')
}

export function listEmployerQueue(requestTwa: RequestTwa, page = 1) {
  return requestTwa<PaginatedResponse<EmployerProfile>>(
    `/api/v1/admin/queue/employers${buildQuery({ page, page_size: 8, sort: 'created_at', order: 'asc' })}`
  )
}

export function listEmployers(
  requestTwa: RequestTwa,
  options: { page?: number; pageSize?: number; reviewStatus?: string } = {}
) {
  const { page = 1, pageSize = 8, reviewStatus } = options
  return requestTwa<PaginatedResponse<EmployerProfile>>(
    `/api/v1/admin/employers${buildQuery({ page, page_size: pageSize, sort: 'created_at', order: 'desc', review_status: reviewStatus })}`
  )
}

export function reviewEmployer(
  requestTwa: RequestTwa,
  employerId: string,
  values: EmployerReviewInput
) {
  return requestTwa<{ employer: EmployerProfile }>(
    `/api/v1/admin/employers/${employerId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    }
  )
}

export function listListingQueue(requestTwa: RequestTwa, page = 1) {
  return requestTwa<PaginatedResponse<JobListing>>(
    `/api/v1/admin/queue/listings${buildQuery({ page, page_size: 8, sort: 'created_at', order: 'asc' })}`
  )
}

export function listListings(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    reviewStatus?: string
    lifecycleStatus?: string
    employerId?: string
    city?: string
    search?: string
  } = {}
) {
  const {
    page = 1,
    pageSize = 8,
    reviewStatus,
    lifecycleStatus,
    employerId,
    city,
    search,
  } = options
  return requestTwa<PaginatedResponse<JobListing>>(
    `/api/v1/admin/listings${buildQuery({ page, page_size: pageSize, sort: 'created_at', order: 'desc', review_status: reviewStatus, lifecycle_status: lifecycleStatus, employer_id: employerId, city, search })}`
  )
}

export function reviewListing(
  requestTwa: RequestTwa,
  listingId: string,
  values: ListingReviewInput
) {
  const body: Record<string, unknown> = {
    review_note: values.review_note || null,
  }
  if (values.review_status) body.review_status = values.review_status
  if (values.lifecycle_status) body.lifecycle_status = values.lifecycle_status
  return requestTwa<{ listing: JobListing }>(
    `/api/v1/admin/listings/${listingId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  )
}

export function listJobseekers(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    transitType?: string
    chargeKey?: keyof ChargeFlags | ''
  } = {}
) {
  const {
    page = 1,
    pageSize = 10,
    search,
    status,
    transitType,
    chargeKey,
  } = options
  return requestTwa<PaginatedResponse<JobseekerListItem>>(
    `/api/v1/admin/jobseekers${buildQuery({
      page,
      page_size: pageSize,
      sort: 'created_at',
      order: 'desc',
      search,
      status,
      transit_type: transitType,
      charge_sex_offense: chargeKey === 'sex_offense' ? true : undefined,
      charge_violent: chargeKey === 'violent' ? true : undefined,
      charge_armed: chargeKey === 'armed' ? true : undefined,
      charge_children: chargeKey === 'children' ? true : undefined,
      charge_drug: chargeKey === 'drug' ? true : undefined,
      charge_theft: chargeKey === 'theft' ? true : undefined,
    })}`
  )
}

export function getJobseekerDetail(
  requestTwa: RequestTwa,
  jobseekerId: string
) {
  return requestTwa<AdminJobseekerDetailResponse>(
    `/api/v1/admin/jobseekers/${jobseekerId}`
  )
}

export function updateJobseeker(
  requestTwa: RequestTwa,
  jobseekerId: string,
  values: JobseekerUpdateInput
) {
  return requestTwa(`/api/v1/admin/jobseekers/${jobseekerId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      full_name: values.full_name || null,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      zip: values.zip || null,
      transit_type: values.transit_type || null,
      status: values.status,
      charges: values.charges,
    }),
  })
}

export function listApplications(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    status?: string
    jobListingId?: string
    jobseekerId?: string
    employerId?: string
  } = {}
) {
  const {
    page = 1,
    pageSize = 10,
    status,
    jobListingId,
    jobseekerId,
    employerId,
  } = options
  return requestTwa<PaginatedResponse<AdminApplication>>(
    `/api/v1/admin/applications${buildQuery({ page, page_size: pageSize, sort: 'applied_at', order: 'desc', status, job_listing_id: jobListingId, jobseeker_id: jobseekerId, employer_id: employerId })}`
  )
}

export function updateApplication(
  requestTwa: RequestTwa,
  applicationId: string,
  values: ApplicationUpdateInput
) {
  return requestTwa(`/api/v1/admin/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export function getNotificationConfig(requestTwa: RequestTwa) {
  return requestTwa<NotificationConfig>('/api/v1/admin/config/notifications')
}

export function listMyNotifications(
  requestTwa: RequestTwa,
  options: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}
) {
  const { page = 1, pageSize = 8, unreadOnly = false } = options
  return requestTwa<PaginatedResponse<AdminNotification>>(
    `/api/v1/notifications/me${buildQuery({ page, page_size: pageSize, unread_only: unreadOnly || undefined })}`
  )
}

export function markMyNotificationRead(
  requestTwa: RequestTwa,
  notificationId: string
) {
  return requestTwa<{ notification: { id: string; read_at: string | null } }>(
    `/api/v1/notifications/me/${notificationId}/read`,
    { method: 'PATCH' }
  )
}

export function markAllMyNotificationsRead(requestTwa: RequestTwa) {
  return requestTwa<AdminNotificationBulkReadResponse>(
    '/api/v1/notifications/me/read-all',
    { method: 'PATCH' }
  )
}

export function updateNotificationConfig(
  requestTwa: RequestTwa,
  values: NotificationConfigUpdateInput
) {
  return requestTwa<{ config: NotificationConfig }>(
    '/api/v1/admin/config/notifications',
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    }
  )
}

export function listAuditLog(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    actorId?: string
    entityType?: string
    action?: string
    dateFrom?: string
    dateTo?: string
  } = {}
) {
  const {
    page = 1,
    pageSize = 12,
    actorId,
    entityType,
    action,
    dateFrom,
    dateTo,
  } = options
  return requestTwa<PaginatedResponse<AuditLogEntry>>(
    `/api/v1/admin/audit-log${buildQuery({ page, page_size: pageSize, actor_id: actorId, entity_type: entityType, action, date_from: dateFrom, date_to: dateTo })}`
  )
}

export function getMatchesForJobseeker(
  requestTwa: RequestTwa,
  jobseekerId: string
) {
  return requestTwa<{ items: ListingMatchItem[] }>(
    `/api/v1/admin/match/jobseeker/${jobseekerId}`
  )
}

export function getMatchesForListing(
  requestTwa: RequestTwa,
  listingId: string
) {
  return requestTwa<{ items: JobseekerMatchItem[] }>(
    `/api/v1/admin/match/listing/${listingId}`
  )
}

export function listAuthUsers(
  requestAuth: RequestAuth,
  options: {
    email?: string
    role?: string
    locked?: boolean
    cursor?: string
    limit?: number
  } = {}
) {
  const { email, role, locked, cursor, limit = 12 } = options
  return requestAuth<CursorPageResponse<AuthAdminUserListItem>>(
    `/admin/users${buildQuery({ email, role, locked, cursor, limit })}`
  )
}

export function getAuthUserDetail(requestAuth: RequestAuth, userId: string) {
  return requestAuth<AuthAdminUserDetail>(`/admin/users/${userId}`)
}

export function listAuthUserSessions(
  requestAuth: RequestAuth,
  userId: string,
  options: {
    status?: 'active' | 'revoked' | 'all'
    cursor?: string
    limit?: number
  } = {}
) {
  const { status = 'active', cursor, limit = 50 } = options
  return requestAuth<CursorPageResponse<AuthAdminSessionItem>>(
    `/admin/users/${userId}/sessions${buildQuery({ status, cursor, limit })}`
  )
}

export function listAuthSuspiciousSessions(
  requestAuth: RequestAuth,
  options: {
    email?: string
    role?: string
    cursor?: string
    limit?: number
  } = {}
) {
  const { email, role, cursor, limit = 50 } = options
  return requestAuth<CursorPageResponse<AuthAdminSuspiciousSessionItem>>(
    `/admin/sessions/suspicious${buildQuery({ email, role, cursor, limit })}`
  )
}

export function getAuthUserSessionDetail(
  requestAuth: RequestAuth,
  userId: string,
  sessionId: string,
  timelineLimit = 20
) {
  return requestAuth<AuthAdminSessionDetail>(
    `/admin/users/${userId}/sessions/${sessionId}${buildQuery({
      timeline_limit: timelineLimit,
    })}`
  )
}

export function requestRevokeActionOtp(requestAuth: RequestAuth) {
  return requestAuth<AuthActionOtpRequestResponse>('/auth/otp/request/action', {
    method: 'POST',
    body: JSON.stringify({ action: 'revoke_sessions' }),
  })
}

export function verifyRevokeActionOtp(requestAuth: RequestAuth, code: string) {
  return requestAuth<AuthActionOtpVerifyResponse>('/auth/otp/verify/action', {
    method: 'POST',
    body: JSON.stringify({ action: 'revoke_sessions', code }),
  })
}

export function revokeAuthUserSession(
  requestAuth: RequestAuth,
  userId: string,
  sessionId: string,
  options: {
    reason?: string
    actionToken: string
  }
) {
  const { reason, actionToken } = options
  return requestAuth<AuthAdminSessionRevokeResponse>(
    `/admin/users/${userId}/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: buildActionHeaders(actionToken),
      body: reason ? JSON.stringify({ reason }) : undefined,
    }
  )
}

export function revokeAllAuthUserSessions(
  requestAuth: RequestAuth,
  userId: string,
  options: {
    reason?: string
    actionToken: string
  }
) {
  const { reason, actionToken } = options
  return requestAuth<AuthAdminUserSessionsRevokedResponse>(
    `/admin/users/${userId}/sessions`,
    {
      method: 'DELETE',
      headers: buildActionHeaders(actionToken),
      body: reason ? JSON.stringify({ reason }) : undefined,
    }
  )
}

export function revokeAuthUserSessionsByFilter(
  requestAuth: RequestAuth,
  userId: string,
  payload: AuthAdminSessionFilterRevokeInput,
  actionToken: string
) {
  return requestAuth<AuthAdminSessionFilteredRevokeResponse>(
    `/admin/users/${userId}/sessions/revoke-by-filter`,
    {
      method: 'POST',
      headers: buildActionHeaders(actionToken),
      body: JSON.stringify(payload),
    }
  )
}
