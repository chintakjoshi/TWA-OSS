export interface ChargeFlags {
  sex_offense: boolean
  violent: boolean
  armed: boolean
  children: boolean
  drug: boolean
  theft: boolean
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
}

export interface EmployerApplicant {
  application_id: string
  status: 'submitted' | 'reviewed' | 'hired'
  applied_at: string
  updated_at: string | null
  jobseeker: {
    id: string
    full_name: string | null
    phone: string | null
    address: string | null
    city: string | null
    zip: string | null
    transit_type: 'own_car' | 'public_transit' | 'both' | null
    charges: ChargeFlags
    profile_complete: boolean
    status: 'active' | 'hired'
  }
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

export interface EmployerProfileFormValues {
  org_name: string
  contact_name: string
  phone: string
  address: string
  city: string
  zip: string
}

export interface ListingFormValues {
  title: string
  description: string
  location_address: string
  city: string
  zip: string
  transit_required: 'own_car' | 'any'
  disqualifying_charges: ChargeFlags
}
