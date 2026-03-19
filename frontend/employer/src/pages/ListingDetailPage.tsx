import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'
import { Alert, Badge, Button, Card, CardBody, DataTable } from '@shared/ui/primitives'

import { getEmployerListing, listEmployerApplicants } from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatChargeFlags, formatDate, formatDateTime, formatStatusLabel, formatTransitAccessibility, formatTransitRequirement } from '../lib/formatting'
import type { EmployerApplicant, JobListing } from '../types/employer'

function applicantStatusTone(status: EmployerApplicant['status']) {
  if (status === 'hired') return 'success'
  if (status === 'reviewed') return 'info'
  return 'warning'
}

export function EmployerListingDetailPage() {
  const auth = useAuth()
  const { listingId = '' } = useParams()
  const [page, setPage] = useState(1)
  const [listing, setListing] = useState<JobListing | null>(null)
  const [applicants, setApplicants] = useState<EmployerApplicant[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applicantMessage, setApplicantMessage] = useState<string | null>(null)
  const [applicantVisibilityDisabled, setApplicantVisibilityDisabled] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    setApplicantMessage(null)
    setApplicantVisibilityDisabled(false)

    void Promise.allSettled([
      getEmployerListing(auth.requestTwa, listingId),
      listEmployerApplicants(auth.requestTwa, listingId, page),
    ])
      .then((results) => {
        if (!active) return

        const listingResult = results[0]
        if (listingResult.status === 'rejected') {
          throw listingResult.reason
        }

        setListing(listingResult.value.listing)

        const applicantResult = results[1]
        if (applicantResult.status === 'fulfilled') {
          setApplicants(applicantResult.value.items)
          setTotalPages(applicantResult.value.meta.total_pages)
          return
        }

        const nextError = applicantResult.reason
        if (nextError instanceof HttpError && nextError.status === 403 && nextError.code === 'APPLICANT_VISIBILITY_DISABLED') {
          setApplicants([])
          setTotalPages(0)
          setApplicantVisibilityDisabled(true)
          setApplicantMessage(nextError.message)
          return
        }

        setApplicants([])
        setTotalPages(0)
        setApplicantMessage(nextError instanceof Error ? nextError.message : 'Unable to load applicants right now.')
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError instanceof Error ? nextError.message : 'Unable to load the listing right now.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, listingId, page])

  if (isLoading) {
    return (
      <div className="page-frame stack-md employer-shell-page">
        <EmployerHeader />
        <LoadingState title="Loading listing details..." />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="page-frame stack-md employer-shell-page">
        <EmployerHeader />
        <ErrorState title="Listing unavailable" message={error ?? 'The listing could not be loaded.'} />
      </div>
    )
  }

  const reviewTone = listing.review_status === 'approved' ? 'success' : listing.review_status === 'rejected' ? 'danger' : 'warning'
  const lifecycleTone = listing.lifecycle_status === 'open' ? 'success' : 'neutral'
  const chargeLabels = formatChargeFlags(listing.disqualifying_charges)

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />

      <Card strong>
        <CardBody className="stack-md">
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stack-sm">
              <p className="portal-eyebrow">Listing Detail</p>
              <h2 className="card-title">{listing.title}</h2>
              <p className="card-copy">{listing.location_address ?? 'Address not provided'}{listing.city ? `, ${listing.city}` : ''}{listing.zip ? ` ${listing.zip}` : ''}</p>
            </div>
            <div className="cluster">
              <Badge tone={reviewTone}>{listing.review_status}</Badge>
              <Badge tone={lifecycleTone}>{listing.lifecycle_status}</Badge>
            </div>
          </div>

          {listing.review_note ? <Alert tone={listing.review_status === 'rejected' ? 'danger' : 'info'}><p>{listing.review_note}</p></Alert> : null}

          <div className="detail-grid">
            <div className="stack-sm">
              <h3 className="detail-heading">Description</h3>
              <p className="card-copy">{listing.description ?? 'No description added yet.'}</p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Transit</h3>
              <p className="card-copy">{formatTransitRequirement(listing.transit_required)}</p>
              <p className="card-copy">{formatTransitAccessibility(listing.transit_accessible)}</p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Disqualifying charges</h3>
              <p className="card-copy">{chargeLabels.length > 0 ? chargeLabels.join(', ') : 'No disqualifying charge categories configured.'}</p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Dates</h3>
              <p className="card-copy">Submitted: {formatDate(listing.created_at)}</p>
              <p className="card-copy">Last updated: {formatDateTime(listing.updated_at)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="portal-eyebrow">Applicants</p>
            <h2 className="card-title">Review shared applicants for this listing.</h2>
            <p className="card-copy">TWA staff controls whether applicant sharing is enabled for employers.</p>
          </div>

          {applicantVisibilityDisabled ? <Alert tone="warning"><p>{applicantMessage ?? 'Applicant visibility is currently disabled for employers.'}</p></Alert> : null}
          {!applicantVisibilityDisabled && applicantMessage ? <Alert tone="danger"><p>{applicantMessage}</p></Alert> : null}

          {!applicantVisibilityDisabled && applicants.length === 0 && !applicantMessage ? (
            <EmptyState title="No applicants yet" message="Once jobseekers apply to this listing, they will appear here with their shared profile details." />
          ) : null}

          {!applicantVisibilityDisabled && applicants.length > 0 ? (
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
        </CardBody>
      </Card>

      {!applicantVisibilityDisabled && applicants.length > 0 && totalPages > 1 ? (
        <Card strong>
          <CardBody>
            <div className="cluster pagination-row">
              <p className="card-copy">Applicant page {page} of {totalPages}</p>
              <div className="inline-actions">
                <Button disabled={page <= 1} tone="secondary" onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
