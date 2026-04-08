import type {
  EmployerApplicant,
  EmployerApplicantListItem,
  EmployerProfile,
  EmployerProfileFormValues,
  JobListing,
  ListingFormValues,
  PaginatedResponse,
} from '../types/employer'
import {
  normalizeSingleLineText,
  normalizeUsZipInput,
} from '@shared/lib/address'

type RequestTwa = <T>(path: string, init?: RequestInit) => Promise<T>

function buildQuery(
  params: Record<string, string | number | undefined | null>
): string {
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

export function updateMyEmployerProfile(
  requestTwa: RequestTwa,
  values: EmployerProfileFormValues
) {
  return requestTwa<{ employer: EmployerProfile }>('/api/v1/employers/me', {
    method: 'PATCH',
    body: JSON.stringify({
      org_name: normalizeSingleLineText(values.org_name),
      contact_name: normalizeSingleLineText(values.contact_name) || null,
      phone: normalizeSingleLineText(values.phone) || null,
      address: normalizeSingleLineText(values.address) || null,
      city: normalizeSingleLineText(values.city) || null,
      zip: normalizeUsZipInput(values.zip) || null,
    }),
  })
}

export function listEmployerListings(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    search?: string
    reviewStatus?: string
    lifecycleStatus?: string
    sort?: string
    order?: 'asc' | 'desc'
  } = {}
) {
  const {
    page = 1,
    pageSize = 8,
    search,
    reviewStatus,
    lifecycleStatus,
    sort = 'created_at',
    order = 'desc',
  } = options
  return requestTwa<PaginatedResponse<JobListing>>(
    `/api/v1/employer/listings${buildQuery({
      page,
      page_size: pageSize,
      search,
      sort,
      order,
      review_status: reviewStatus,
      lifecycle_status: lifecycleStatus,
    })}`
  )
}

export function getEmployerListing(requestTwa: RequestTwa, listingId: string) {
  return requestTwa<{ listing: JobListing }>(
    `/api/v1/employer/listings/${listingId}`
  )
}

export function createEmployerListing(
  requestTwa: RequestTwa,
  values: ListingFormValues
) {
  return requestTwa<{ listing: JobListing }>('/api/v1/employer/listings', {
    method: 'POST',
    body: JSON.stringify({
      ...values,
      title: normalizeSingleLineText(values.title),
      location_address:
        normalizeSingleLineText(values.location_address) || null,
      city: normalizeSingleLineText(values.city) || null,
      zip: normalizeUsZipInput(values.zip) || null,
    }),
  })
}

export function listEmployerApplicants(
  requestTwa: RequestTwa,
  listingId: string,
  options: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    sort?: string
    order?: 'asc' | 'desc'
  } = {}
) {
  const {
    page = 1,
    pageSize = 10,
    search,
    status,
    sort = 'applied_at',
    order = 'desc',
  } = options
  return requestTwa<PaginatedResponse<EmployerApplicant>>(
    `/api/v1/employer/listings/${listingId}/applicants${buildQuery({
      page,
      page_size: pageSize,
      search,
      status,
      sort,
      order,
    })}`
  )
}

export function listEmployerApplications(
  requestTwa: RequestTwa,
  options: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    listingId?: string
    sort?: string
    order?: 'asc' | 'desc'
  } = {}
) {
  const {
    page = 1,
    pageSize = 10,
    search,
    status,
    listingId,
    sort = 'applied_at',
    order = 'desc',
  } = options
  return requestTwa<PaginatedResponse<EmployerApplicantListItem>>(
    `/api/v1/employer/applicants${buildQuery({
      page,
      page_size: pageSize,
      search,
      status,
      job_listing_id: listingId,
      sort,
      order,
    })}`
  )
}
