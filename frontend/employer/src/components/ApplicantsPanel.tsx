import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'
import { Alert, Badge, Button, Card, CardBody, DataTable } from '@shared/ui/primitives'

import { listEmployerApplicants } from '../api/employerApi'
import { formatChargeFlags, formatDateTime, formatStatusLabel } from '../lib/formatting'
import type { EmployerApplicant } from '../types/employer'
import { EmptyState, LoadingState } from './PageState'

function applicantStatusTone(status: EmployerApplicant['status']) {
  if (status === 'hired') return 'success'
  if (status === 'reviewed') return 'info'
  return 'warning'
}

export function ApplicantsPanel({
  listingId,
  title = 'Review shared applicants for this listing.',
  description = 'TWA staff controls whether applicant sharing is enabled for employers.',
}: {
  listingId: string
  title?: string
  description?: string
}) {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [applicants, setApplicants] = useState<EmployerApplicant[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [applicantVisibilityDisabled, setApplicantVisibilityDisabled] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setMessage(null)
    setApplicantVisibilityDisabled(false)

    void listEmployerApplicants(auth.requestTwa, listingId, page)
      .then((response) => {
        if (!active) return
        setApplicants(response.items)
        setTotalPages(response.meta.total_pages)
      })
      .catch((nextError) => {
        if (!active) return
        if (nextError instanceof HttpError && nextError.status === 403 && nextError.code === 'APPLICANT_VISIBILITY_DISABLED') {
          setApplicants([])
          setTotalPages(0)
          setApplicantVisibilityDisabled(true)
          setMessage(nextError.message)
          return
        }

        setApplicants([])
        setTotalPages(0)
        setMessage(nextError instanceof Error ? nextError.message : 'Unable to load applicants right now.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, listingId, page])

  return (
    <Card strong>
      <CardBody className="stack-md">
        <div className="stack-sm">
          <p className="portal-eyebrow">Applicants</p>
          <h2 className="card-title">{title}</h2>
          <p className="card-copy">{description}</p>
        </div>

        {isLoading ? <LoadingState title="Loading applicants..." /> : null}
        {!isLoading && applicantVisibilityDisabled ? <Alert tone="warning"><p>{message ?? 'Applicant visibility is currently disabled for employers.'}</p></Alert> : null}
        {!isLoading && !applicantVisibilityDisabled && message ? <Alert tone="danger"><p>{message}</p></Alert> : null}

        {!isLoading && !applicantVisibilityDisabled && applicants.length === 0 && !message ? (
          <EmptyState title="No applicants yet" message="Once jobseekers apply to this listing, they will appear here with their shared profile details." />
        ) : null}

        {!isLoading && !applicantVisibilityDisabled && applicants.length > 0 ? (
          <Card>
            <CardBody className="stack-md">
              <DataTable
                columns={['Applicant', 'Phone', 'City', 'Transit', 'Charges', 'Status', 'Applied']}
                rows={applicants.map((applicant) => [
                  applicant.jobseeker.full_name ?? 'Name not provided',
                  applicant.jobseeker.phone ?? 'No phone',
                  applicant.jobseeker.city ?? 'Unknown',
                  applicant.jobseeker.transit_type ? formatStatusLabel(applicant.jobseeker.transit_type) : 'Not set',
                  formatChargeFlags(applicant.jobseeker.charges).join(', ') || 'None',
                  <Badge key={`${applicant.application_id}-status`} tone={applicantStatusTone(applicant.status)}>{applicant.status}</Badge>,
                  formatDateTime(applicant.applied_at),
                ])}
              />
            </CardBody>
          </Card>
        ) : null}

        {!isLoading && !applicantVisibilityDisabled && applicants.length > 0 && totalPages > 1 ? (
          <div className="cluster pagination-row">
            <p className="card-copy">Applicant page {page} of {totalPages}</p>
            <div className="inline-actions">
              <Button disabled={page <= 1} tone="secondary" onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
