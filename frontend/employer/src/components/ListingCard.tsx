import { Link } from 'react-router-dom'

import { formatChargeSummary, formatDate, formatTransitRequirement, getStatusTone } from '../lib/formatting'
import type { JobListing } from '../types/employer'
import { PortalBadge, PortalButton, PortalPanel } from './ui/EmployerUi'

export function ListingCard({
  listing,
  applicantsCount,
}: {
  listing: JobListing
  applicantsCount?: number | null
}) {
  return (
    <PortalPanel className="h-full">
      <div className="space-y-6 px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
              {formatDate(listing.created_at)}
            </p>
            <h3 className="employer-display mt-2 text-[1.4rem] font-semibold text-slate-950">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {listing.city || 'Location pending'} {listing.zip ? `· ${listing.zip}` : ''}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <PortalBadge tone={getStatusTone(listing.review_status)}>
              {listing.review_status === 'approved'
                ? 'Approved'
                : listing.review_status === 'rejected'
                  ? 'Rejected'
                  : 'Pending review'}
            </PortalBadge>
            <PortalBadge tone={getStatusTone(listing.lifecycle_status)}>
              {listing.lifecycle_status === 'open' ? 'Live' : 'Closed'}
            </PortalBadge>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
              Transit
            </p>
            <p className="mt-1">{formatTransitRequirement(listing.transit_required)}</p>
          </div>
          <div className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
              Applicants
            </p>
            <p className="mt-1">
              {applicantsCount === null || applicantsCount === undefined
                ? 'Available when applicant sharing is enabled'
                : `${applicantsCount} tracked in portal`}
            </p>
          </div>
        </div>

        <p className="rounded-2xl bg-[#fcfaf6] px-4 py-3 text-sm text-slate-600">
          {formatChargeSummary(listing.disqualifying_charges)}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex" to={`/my-listings/${listing.id}`}>
            <PortalButton variant="secondary">View details</PortalButton>
          </Link>
          <Link className="inline-flex" to={`/listings/${listing.id}/applicants`}>
            <PortalButton variant="ghost">Applicants</PortalButton>
          </Link>
        </div>
      </div>
    </PortalPanel>
  )
}
