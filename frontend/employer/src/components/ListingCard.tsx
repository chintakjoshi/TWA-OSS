import type { ReactNode } from 'react'

import { Badge, Card, CardBody } from '@shared/ui/primitives'

import {
  formatChargeFlags,
  formatDate,
  formatTransitAccessibility,
  formatTransitRequirement,
} from '../lib/formatting'
import type { JobListing } from '../types/employer'

export function ListingCard({
  listing,
  children,
}: {
  listing: JobListing
  children?: ReactNode
}) {
  const reviewTone =
    listing.review_status === 'approved'
      ? 'success'
      : listing.review_status === 'rejected'
        ? 'danger'
        : 'warning'
  const lifecycleTone =
    listing.lifecycle_status === 'open' ? 'success' : 'neutral'
  const charges = formatChargeFlags(listing.disqualifying_charges)

  return (
    <Card className="listing-card-stack" strong>
      <CardBody className="stack-md">
        <div
          className="cluster"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div className="stack-sm">
            <h2 className="card-title">{listing.title}</h2>
            <p className="card-copy">
              {listing.city ?? 'City not set'}
              {listing.zip ? `, ${listing.zip}` : ''}
            </p>
          </div>
          <div className="cluster">
            <Badge tone={reviewTone}>{listing.review_status}</Badge>
            <Badge tone={lifecycleTone}>{listing.lifecycle_status}</Badge>
          </div>
        </div>
        <p className="card-copy">
          {listing.description ?? 'No description added yet.'}
        </p>
        <div className="listing-meta-grid">
          <p className="card-copy">
            Submitted {formatDate(listing.created_at)}
          </p>
          <p className="card-copy">
            {formatTransitRequirement(listing.transit_required)}
          </p>
          <p className="card-copy">
            {formatTransitAccessibility(listing.transit_accessible)}
          </p>
          <p className="card-copy">
            {charges.length > 0
              ? `Disqualifying: ${charges.join(', ')}`
              : 'No disqualifying charges set'}
          </p>
        </div>
        {listing.review_note ? (
          <p className="listing-note">{listing.review_note}</p>
        ) : null}
        {children ? <div className="inline-actions">{children}</div> : null}
      </CardBody>
    </Card>
  )
}
