export interface ChargeFlags {
  sex_offense: boolean
  violent: boolean
  armed: boolean
  children: boolean
  drug: boolean
  theft: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export interface CursorPageResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

export interface AdminDashboard {
  pending_employers: number
  pending_listings: number
  active_jobseekers: number
  open_applications: number
  open_listings: number
}

export interface EmployerProfile {
  id: string
  app_user_id: string
  auth_user_id: string
  org_name: string
  contact_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  zip: string | null
  review_status: 'pending' | 'approved' | 'rejected'
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
  profile_changes?: EmployerProfileChangeSummary | null
}

export interface EmployerProfileFieldChange {
  field: 'org_name' | 'contact_name' | 'phone' | 'address' | 'city' | 'zip'
  label: string
  previous_value: string | null
  current_value: string | null
}

export interface EmployerProfileChangeSummary {
  changed_at: string
  changes: EmployerProfileFieldChange[]
}

export interface JobListing {
  id: string
  employer_id: string
  title: string
  description: string | null
  location_address: string | null
  city: string | null
  zip: string | null
  transit_required: 'own_car' | 'any'
  disqualifying_charges: ChargeFlags
  transit_accessible: boolean | null
  job_lat: number | null
  job_lon: number | null
  review_status: 'pending' | 'approved' | 'rejected'
  lifecycle_status: 'open' | 'closed'
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
  employer?: EmployerProfile | null
}

export interface JobseekerListItem {
  id: string
  full_name: string | null
  city: string | null
  zip: string | null
  transit_type: 'own_car' | 'public_transit' | 'both' | null
  status: 'active' | 'hired'
}

export interface JobseekerDetail extends JobseekerListItem {
  app_user_id: string
  auth_user_id: string
  phone: string | null
  address: string | null
  charges: ChargeFlags
  profile_complete: boolean
  created_at: string | null
  updated_at: string | null
}

export interface JobseekerApplicationSummary {
  id: string
  status: 'submitted' | 'reviewed' | 'hired'
  job_listing_id: string
}

export interface AdminJobseekerDetailResponse {
  jobseeker: JobseekerDetail
  applications: JobseekerApplicationSummary[]
}

export interface AdminApplication {
  id: string
  status: 'submitted' | 'reviewed' | 'hired'
  applied_at: string
  updated_at: string | null
  jobseeker: {
    id: string
    full_name: string | null
  }
  job: {
    id: string
    title: string
  }
}

export interface NotificationConfig {
  notify_staff_on_apply: boolean
  notify_employer_on_apply: boolean
  share_applicants_with_employer: boolean
  updated_by: string | null
  updated_at: string | null
}

export interface AdminNotification {
  id: string
  type: string
  channel: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export interface AdminNotificationSnapshot {
  notifications: AdminNotification[]
  unread_count: number
}

export interface AdminNotificationReadResult {
  id: string
  read_at: string | null
}

export interface AdminNotificationBulkReadResponse {
  notifications: AdminNotificationReadResult[]
  marked_count: number
}

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  timestamp: string
}

export interface JobseekerMatchItem {
  jobseeker: {
    id: string
    full_name: string | null
    city: string | null
  }
  is_eligible: boolean
  ineligibility_reasons: string[]
}

export interface ListingMatchItem {
  job: {
    id: string
    title: string
    city: string | null
  }
  is_eligible: boolean
  ineligibility_reasons: string[]
  ineligibility_tag: string | null
}

export interface EmployerReviewInput {
  review_status: 'pending' | 'approved' | 'rejected'
  review_note: string
}

export interface ListingReviewInput {
  review_status?: 'pending' | 'approved' | 'rejected'
  lifecycle_status?: 'open' | 'closed'
  review_note: string
}

export interface JobseekerUpdateInput {
  full_name: string
  phone: string
  address: string
  city: string
  zip: string
  transit_type: 'own_car' | 'public_transit' | 'both' | ''
  status: 'active' | 'hired'
  charges: ChargeFlags
}

export interface ApplicationUpdateInput {
  status: 'submitted' | 'reviewed' | 'hired'
  close_listing_after_hire: boolean
}

export interface NotificationConfigUpdateInput {
  notify_staff_on_apply: boolean
  notify_employer_on_apply: boolean
  share_applicants_with_employer: boolean
}

export interface AuthAdminUserListItem {
  id: string
  email: string
  role: 'admin' | 'user' | string
  is_active: boolean
  email_verified: boolean
  email_otp_enabled: boolean
  locked: boolean
  lock_retry_after: number | null
  created_at: string
  updated_at: string
}

export interface AuthAdminUserDetail extends AuthAdminUserListItem {
  active_session_count: number
}

export interface AuthAdminSessionItem {
  session_id: string
  user_id: string
  created_at: string
  last_seen_at: string | null
  expires_at: string
  revoked_at: string | null
  revoke_reason: string | null
  ip_address: string | null
  user_agent: string | null
  device_label: string
  is_suspicious: boolean
  suspicious_reasons: string[]
}

export interface AuthAdminSuspiciousSessionItem extends AuthAdminSessionItem {
  user_email: string
  user_role: string
}

export interface AuthAdminSessionTimelineItem {
  event_type: string
  success: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuthAdminSessionDetail extends AuthAdminSessionItem {
  timeline: AuthAdminSessionTimelineItem[]
}

export interface AuthAdminSessionRevokeResponse {
  user_id: string
  session_id: string
  revoke_reason: string
}

export interface AuthAdminUserSessionsRevokedResponse {
  user_id: string
  revoked_session_ids: string[]
  revoked_session_count: number
  revoke_reason: string
}

export interface AuthAdminSessionFilterRevokeInput {
  is_suspicious?: boolean
  created_before?: string
  created_after?: string
  last_seen_before?: string
  last_seen_after?: string
  ip_address?: string
  user_agent_contains?: string
  dry_run?: boolean
  reason?: string
}

export interface AuthAdminSessionFilteredRevokeResponse {
  user_id: string
  matched_session_ids: string[]
  matched_session_count: number
  revoked_session_ids: string[]
  revoked_session_count: number
  dry_run: boolean
  revoke_reason: string
}

export interface AuthActionOtpRequestResponse {
  sent: true
  action: string
  expires_in: number
}

export interface AuthActionOtpVerifyResponse {
  action_token: string
}
