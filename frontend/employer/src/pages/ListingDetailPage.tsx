import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Card, CardBody } from '@shared/ui/primitives'

import { getEmployerListing } from '../api/employerApi'
import { ApplicantsPanel } from '../components/ApplicantsPanel'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  formatChargeFlags,
  formatDate,
  formatDateTime,
  formatTransitAccessibility,
  formatTransitRequirement,
} from '../lib/formatting'
import type { JobListing } from '../types/employer'

export function EmployerListingDetailPage() {
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
      .catch((nextError) => {
        if (!active) return
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load the listing right now.'
        )
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
        <LoadingState title="Loading listing details..." />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="page-frame stack-md employer-shell-page">
        <EmployerHeader />
        <ErrorState
          title="Listing unavailable"
          message={error ?? 'The listing could not be loaded.'}
        />
      </div>
    )
  }

  const reviewTone =
    listing.review_status === 'approved'
      ? 'success'
      : listing.review_status === 'rejected'
        ? 'danger'
        : 'warning'
  const lifecycleTone =
    listing.lifecycle_status === 'open' ? 'success' : 'neutral'
  const chargeLabels = formatChargeFlags(listing.disqualifying_charges)

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />

      <Card strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div className="stack-sm">
              <p className="portal-eyebrow">Listing Detail</p>
              <h2 className="card-title">{listing.title}</h2>
              <p className="card-copy">
                {listing.location_address ?? 'Address not provided'}
                {listing.city ? `, ${listing.city}` : ''}
                {listing.zip ? ` ${listing.zip}` : ''}
              </p>
            </div>
            <div className="cluster">
              <Badge tone={reviewTone}>{listing.review_status}</Badge>
              <Badge tone={lifecycleTone}>{listing.lifecycle_status}</Badge>
            </div>
          </div>

          {listing.review_note ? (
            <Alert
              tone={listing.review_status === 'rejected' ? 'danger' : 'info'}
            >
              <p>{listing.review_note}</p>
            </Alert>
          ) : null}

          <div className="detail-grid">
            <div className="stack-sm">
              <h3 className="detail-heading">Description</h3>
              <p className="card-copy">
                {listing.description ?? 'No description added yet.'}
              </p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Transit</h3>
              <p className="card-copy">
                {formatTransitRequirement(listing.transit_required)}
              </p>
              <p className="card-copy">
                {formatTransitAccessibility(listing.transit_accessible)}
              </p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Disqualifying charges</h3>
              <p className="card-copy">
                {chargeLabels.length > 0
                  ? chargeLabels.join(', ')
                  : 'No disqualifying charge categories configured.'}
              </p>
            </div>
            <div className="stack-sm">
              <h3 className="detail-heading">Dates</h3>
              <p className="card-copy">
                Submitted: {formatDate(listing.created_at)}
              </p>
              <p className="card-copy">
                Last updated: {formatDateTime(listing.updated_at)}
              </p>
            </div>
          </div>

          <div className="inline-actions">
            <Link
              className="button button-secondary"
              to={`/listings/${listing.id}/applicants`}
            >
              Open applicants screen
            </Link>
          </div>
        </CardBody>
      </Card>

      <ApplicantsPanel listingId={listing.id} />
    </div>
  )
}
