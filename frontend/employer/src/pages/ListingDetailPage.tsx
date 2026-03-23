import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { getEmployerListing } from '../api/employerApi'
import { ApplicantsPanel } from '../components/ApplicantsPanel'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  DefinitionList,
  InlineNotice,
  PortalBadge,
  PortalButton,
  PortalPanel,
  Surface,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'
import {
  formatChargeSummary,
  formatDate,
  formatDateTime,
  formatTransitAccessibility,
  formatTransitRequirement,
  getStatusTone,
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
      <div className="min-h-screen bg-[#f7f1e5]">
        <EmployerHeader />
        <main className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8">
          <LoadingState title="Loading listing details..." />
        </main>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#f7f1e5]">
        <EmployerHeader />
        <main className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8">
          <ErrorState
            title="Listing unavailable"
            message={error ?? 'The listing could not be loaded.'}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 lg:px-8">
        <PortalPanel>
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <PortalBadge tone={getStatusTone(listing.review_status)}>
                    {listing.review_status === 'approved'
                      ? 'Approved'
                      : listing.review_status === 'rejected'
                        ? 'Changes requested'
                        : 'Under review'}
                  </PortalBadge>
                  <PortalBadge tone={getStatusTone(listing.lifecycle_status)}>
                    {listing.lifecycle_status === 'open' ? 'Live' : 'Closed'}
                  </PortalBadge>
                </div>
                <h1 className="employer-display mt-4 text-[2.4rem] leading-[1.02] font-semibold text-slate-950">
                  {listing.title}
                </h1>
                <p className="mt-3 text-base leading-8 text-slate-500">
                  {listing.location_address ?? 'Address pending'}
                  {listing.city ? `, ${listing.city}` : ''}
                  {listing.zip ? ` ${listing.zip}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/my-listings">
                  <PortalButton variant="secondary">
                    Back to listings
                  </PortalButton>
                </Link>
                <PortalButton
                  variant="ghost"
                  onClick={() => announceComingSoon('Edit and resubmit')}
                >
                  Edit &amp; Resubmit
                </PortalButton>
              </div>
            </div>

            {listing.review_note ? (
              <InlineNotice
                tone={listing.review_status === 'rejected' ? 'danger' : 'info'}
              >
                {listing.review_note}
              </InlineNotice>
            ) : null}
          </div>
        </PortalPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <Surface>
            <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
              Listing overview
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {listing.description ??
                'No listing description has been added yet.'}
            </p>

            <DefinitionList
              className="mt-6"
              items={[
                {
                  label: 'Transit requirement',
                  value: formatTransitRequirement(listing.transit_required),
                },
                {
                  label: 'Transit accessibility',
                  value: formatTransitAccessibility(listing.transit_accessible),
                },
                {
                  label: 'Disqualifying charges',
                  value: formatChargeSummary(listing.disqualifying_charges),
                },
                {
                  label: 'Submitted',
                  value: formatDate(listing.created_at),
                },
                {
                  label: 'Last updated',
                  value: formatDateTime(listing.updated_at),
                },
                {
                  label: 'Lifecycle',
                  value:
                    listing.lifecycle_status === 'open' ? 'Open' : 'Closed',
                },
              ]}
            />
          </Surface>

          <Surface>
            <h2 className="employer-display text-[1.5rem] font-semibold text-slate-950">
              Quick actions
            </h2>
            <div className="mt-5 space-y-3">
              <PortalButton
                className="w-full"
                variant="secondary"
                onClick={() => announceComingSoon('Close listing')}
              >
                Close listing
              </PortalButton>
              <PortalButton
                className="w-full"
                variant="secondary"
                onClick={() => announceComingSoon('Reactivate listing')}
              >
                Reactivate listing
              </PortalButton>
              <PortalButton
                className="w-full"
                variant="ghost"
                onClick={() => announceComingSoon('Export listing')}
              >
                Export listing
              </PortalButton>
            </div>
          </Surface>
        </div>

        <ApplicantsPanel
          description="Applicant visibility depends on the current TWA notification configuration for employers."
          listingId={listing.id}
          title="Applicants for this listing"
        />
      </main>
    </div>
  )
}
