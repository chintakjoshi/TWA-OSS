import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Badge, Card, CardBody } from '@shared/ui/primitives'

import { getEmployerListing } from '../api/employerApi'
import { ApplicantsPanel } from '../components/ApplicantsPanel'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import { formatDate, formatDateTime, formatStatusLabel, formatTransitAccessibility, formatTransitRequirement } from '../lib/formatting'
import type { JobListing } from '../types/employer'

export function EmployerApplicantsPage() {
  const auth = useAuth()
  const { listingId = '' } = useParams()
  const [listing, setListing] = useState<JobListing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getEmployerListing(auth.requestTwa, listingId)
      .then((response) => {
        if (!active) return
        setListing(response.listing)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, listingId])

  if (isLoading) {
    return (
      <div className="page-frame stack-md employer-shell-page">
        <EmployerHeader />
        <LoadingState title="Loading applicants screen..." />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="page-frame stack-md employer-shell-page">
        <EmployerHeader />
        <ErrorState title="Applicants unavailable" message={error ?? 'The applicants screen could not be loaded.'} />
      </div>
    )
  }

  const reviewTone = listing.review_status === 'approved' ? 'success' : listing.review_status === 'rejected' ? 'danger' : 'warning'
  const lifecycleTone = listing.lifecycle_status === 'open' ? 'success' : 'neutral'

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />

      <Card strong>
        <CardBody className="stack-md">
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stack-sm">
              <p className="portal-eyebrow">Applicants Screen</p>
              <h2 className="card-title">{listing.title}</h2>
              <p className="card-copy">{listing.location_address ?? 'Address not provided'}{listing.city ? `, ${listing.city}` : ''}{listing.zip ? ` ${listing.zip}` : ''}</p>
            </div>
            <div className="cluster">
              <Badge tone={reviewTone}>{listing.review_status}</Badge>
              <Badge tone={lifecycleTone}>{listing.lifecycle_status}</Badge>
            </div>
          </div>

          <div className="detail-grid">
            <div className="stack-sm">
              <h3 className="detail-heading">Transit</h3>
              <p className="card-copy">{formatTransitRequirement(listing.transit_required)}</p>
              <p className="card-copy">{formatTransitAccessibility(listing.transit_accessible)}</p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Tracking</h3>
              <p className="card-copy">Submitted: {formatDate(listing.created_at)}</p>
              <p className="card-copy">Last updated: {formatDateTime(listing.updated_at)}</p>
            </div>
          </div>

          <div className="inline-actions">
            <Link className="button button-secondary" to={`/listings/${listing.id}`}>Back to listing detail</Link>
            <Link className="button button-ghost" to="/listings">Back to listings</Link>
          </div>
        </CardBody>
      </Card>

      <ApplicantsPanel
        listingId={listing.id}
        title="Review applicants in a dedicated employer screen."
        description={`This route keeps applicant review separate from listing metadata. Listing status is ${formatStatusLabel(listing.lifecycle_status)}.`}
      />
    </div>
  )
}
