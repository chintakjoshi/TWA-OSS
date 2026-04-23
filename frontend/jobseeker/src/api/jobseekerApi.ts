import type {
  JobseekerProfileFormValues,
  PaginatedResponse,
  JobListItem,
  JobDetailPayload,
  JobseekerProfile,
  ApplicationListItem,
  ApplicationPayload,
  JobListFilters,
} from '../types/jobseeker'

type RequestTwa = <T>(path: string, init?: RequestInit) => Promise<T>

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getMyJobseekerProfile(requestTwa: RequestTwa) {
  return requestTwa<{ profile: JobseekerProfile }>('/api/v1/jobseekers/me')
}

export function updateMyJobseekerProfile(
  requestTwa: RequestTwa,
  values: JobseekerProfileFormValues
) {
  return requestTwa<{
    profile: {
      id: string
      profile_complete: boolean
      updated_at: string | null
    }
  }>('/api/v1/jobseekers/me', {
    method: 'PATCH',
    body: JSON.stringify({
      full_name: values.full_name || null,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      zip: values.zip || null,
      transit_type: values.transit_type || null,
      charges: values.charges,
    }),
  })
}

export function listVisibleJobs(
  requestTwa: RequestTwa,
  filters: JobListFilters = {}
) {
  const { page = 1, search, city, transit_required, is_eligible } = filters
  return requestTwa<PaginatedResponse<JobListItem>>(
    `/api/v1/jobs${buildQuery({
      page,
      page_size: 6,
      sort: 'created_at',
      order: 'desc',
      search,
      city,
      transit_required,
      is_eligible,
    })}`
  )
}

export function getVisibleJobDetail(requestTwa: RequestTwa, jobId: string) {
  return requestTwa<JobDetailPayload>(`/api/v1/jobs/${jobId}`)
}

export function createApplication(
  requestTwa: RequestTwa,
  jobListingId: string,
  options: { signal?: AbortSignal } = {}
) {
  return requestTwa<{ application: ApplicationPayload }>(
    '/api/v1/applications',
    {
      method: 'POST',
      body: JSON.stringify({ job_listing_id: jobListingId }),
      signal: options.signal,
    }
  )
}

export function listMyApplications(
  requestTwa: RequestTwa,
  options: { page?: number; status?: string } = {}
) {
  const { page = 1, status } = options
  return requestTwa<PaginatedResponse<ApplicationListItem>>(
    `/api/v1/applications/me${buildQuery({ page, page_size: 8, sort: 'applied_at', order: 'desc', status })}`
  )
}
