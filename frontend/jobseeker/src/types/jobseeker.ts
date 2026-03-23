export interface ChargeFlags {
  sex_offense: boolean
  violent: boolean
  armed: boolean
  children: boolean
  drug: boolean
  theft: boolean
}

export interface JobseekerProfile {
  id: string
  app_user_id: string
  auth_user_id: string
  full_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  zip: string | null
  transit_type: 'own_car' | 'public_transit' | 'both' | null
  charges: ChargeFlags
  profile_complete: boolean
  status: 'active' | 'hired'
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

export interface JobListItem {
  job: JobListing
  is_eligible: boolean
  ineligibility_tag: string | null
}

export interface JobListFilters {
  page?: number
  search?: string
  city?: string
  transit_required?: 'own_car' | 'any' | ''
  is_eligible?: boolean
}

export interface JobDetailPayload {
  job: JobListing
  eligibility: {
    is_eligible: boolean
    ineligibility_tag: string | null
  }
}

export interface ApplicationListItem {
  id: string
  status: 'submitted' | 'reviewed' | 'hired'
  applied_at: string
  updated_at: string | null
  job: {
    id: string
    title: string
    city: string | null
    lifecycle_status: 'open' | 'closed'
  }
}

export interface ApplicationPayload {
  id: string
  jobseeker_id: string
  job_listing_id: string
  status: 'submitted' | 'reviewed' | 'hired'
  applied_at: string
  updated_at: string | null
}

export interface JobseekerProfileFormValues {
  full_name: string
  phone: string
  address: string
  city: string
  zip: string
  transit_type: 'own_car' | 'public_transit' | 'both' | ''
  charges: ChargeFlags
}
