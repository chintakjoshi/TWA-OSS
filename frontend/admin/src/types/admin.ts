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
