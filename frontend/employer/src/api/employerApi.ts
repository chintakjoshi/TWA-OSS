import type {
  EmployerApplicant,
  EmployerProfile,
  EmployerProfileFormValues,
  JobListing,
  ListingFormValues,
  PaginatedResponse,
} from '../types/employer'

type RequestTwa = <T>(path: string, init?: RequestInit) => Promise<T>

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getMyEmployerProfile(requestTwa: RequestTwa) {
  return requestTwa<{ employer: EmployerProfile }>('/api/v1/employers/me')
}

export function updateMyEmployerProfile(requestTwa: RequestTwa, values: EmployerProfileFormValues) {
  return requestTwa<{ employer: EmployerProfile }>('/api/v1/employers/me', {
    method: 'PATCH',
    body: JSON.stringify({
      org_name: values.org_name,
      contact_name: values.contact_name || null,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      zip: values.zip || null,
    }),
  })
}

export function listEmployerListings(
  requestTwa: RequestTwa,
  options: { page?: number; reviewStatus?: string; lifecycleStatus?: string } = {},
) {
  const { page = 1, reviewStatus, lifecycleStatus } = options
  return requestTwa<PaginatedResponse<JobListing>>(
    `/api/v1/employer/listings${buildQuery({
      page,
      page_size: 8,
      sort: 'created_at',
      order: 'desc',
      review_status: reviewStatus,
      lifecycle_status: lifecycleStatus,
    })}`,
  )
}

export function getEmployerListing(requestTwa: RequestTwa, listingId: string) {
  return requestTwa<{ listing: JobListing }>(`/api/v1/employer/listings/${listingId}`)
}

export function createEmployerListing(requestTwa: RequestTwa, values: ListingFormValues) {
  return requestTwa<{ listing: JobListing }>('/api/v1/employer/listings', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function listEmployerApplicants(requestTwa: RequestTwa, listingId: string, page = 1) {
  return requestTwa<PaginatedResponse<EmployerApplicant>>(
    `/api/v1/employer/listings/${listingId}/applicants${buildQuery({ page, page_size: 10 })}`,
  )
}
