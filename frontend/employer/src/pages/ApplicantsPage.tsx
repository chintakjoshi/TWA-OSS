import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import {
  getEmployerListing,
  listEmployerApplicants,
  listEmployerListings,
} from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  PortalBadge,
  PortalButton,
  PortalPanel,
  Surface,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'
import {
  formatChargeFlags,
  formatDate,
  formatStatusLabel,
  formatTransitType,
  getApplicationTone,
  getInitials,
  isListingVisible,
} from '../lib/formatting'
import type { EmployerApplicant, JobListing } from '../types/employer'

type ApplicantGroup = {
  listing: JobListing
  applicants: EmployerApplicant[]
}

export function EmployerApplicantsPage() {
  const auth = useAuth()
  const { listingId } = useParams()
  const [groups, setGroups] = useState<ApplicantGroup[]>([])
  const [listingTotal, setListingTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharingDisabled, setSharingDisabled] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    setSharingDisabled(false)

    async function load() {
      if (listingId) {
        const listingResponse = await getEmployerListing(auth.requestTwa, listingId)
        const applicantsResponse = await listEmployerApplicants(auth.requestTwa, listingId, 1)
        if (!active) return
        setListingTotal(1)
        setGroups([
          {
            listing: listingResponse.listing,
            applicants: applicantsResponse.items,
          },
        ])
        return
      }

      const listingsResponse = await listEmployerListings(auth.requestTwa, {
        page: 1,
        pageSize: 100,
      })
      const visibleListings = listingsResponse.items.filter(isListingVisible)
      if (!active) return
      setListingTotal(listingsResponse.meta.total_items)

      if (visibleListings.length === 0) {
        setGroups([])
        return
      }

      const nextGroups: ApplicantGroup[] = []
      for (const listing of visibleListings) {
        const applicantResponse = await listEmployerApplicants(auth.requestTwa, listing.id, 1)
        nextGroups.push({ listing, applicants: applicantResponse.items })
      }
      if (active) setGroups(nextGroups)
    }

    void load()
      .catch((nextError: unknown) => {
        if (!active) return
        if (
          nextError instanceof HttpError &&
          nextError.status === 403 &&
          nextError.code === 'APPLICANT_VISIBILITY_DISABLED'
        ) {
          setSharingDisabled(true)
          setGroups([])
          return
        }
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load employer applicants right now.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, listingId])

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader listingCount={listingTotal} />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 lg:px-8">
        <PortalPanel>
          <div className="space-y-5 px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="employer-display text-[2.4rem] leading-[1.02] font-semibold text-slate-950">
                  Applicants
                </h1>
                <p className="mt-3 text-base leading-8 text-slate-500">
                  Candidates matched to and applied for your visible TWA listings.
                </p>
              </div>
              {!sharingDisabled ? (
                <PortalBadge tone="success">Applicant sharing enabled by TWA</PortalBadge>
              ) : null}
            </div>
          </div>
        </PortalPanel>

        {isLoading ? <LoadingState title="Loading applicants..." /> : null}
        {!isLoading && error ? (
          <ErrorState title="Applicants unavailable" message={error} />
        ) : null}
        {!isLoading && sharingDisabled ? (
          <Surface className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff4d7] text-3xl">
              🔒
            </div>
            <h2 className="employer-display mt-6 text-[2rem] font-semibold text-slate-950">
              Applicant visibility is currently off
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-slate-500">
              TWA staff control whether employers can view applicant information.
              When enabled, matched candidates for your listings will appear here.
            </p>
            <div className="mt-6 flex justify-center">
              <PortalButton
                variant="secondary"
                onClick={() => announceComingSoon('Applicant sharing preview')}
              >
                Preview with sharing enabled
              </PortalButton>
            </div>
          </Surface>
        ) : null}
        {!isLoading && !error && !sharingDisabled && groups.length === 0 ? (
          <EmptyState
            title="No applicants to review yet"
            message="Once approved listings receive applications, they will appear here grouped by listing."
          />
        ) : null}

        {!isLoading && !error && !sharingDisabled && groups.length > 0 ? (
          <div className="space-y-8">
            {groups.map((group) => (
              <PortalPanel key={group.listing.id}>
                <div className="border-b border-[#eadfce] px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
                        {group.listing.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.listing.city || 'Location pending'} · {group.applicants.length} applicants
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PortalBadge tone="success">Live</PortalBadge>
                      <Link to={`/my-listings/${group.listing.id}`}>
                        <PortalButton variant="secondary">Listing details</PortalButton>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 px-6 py-6">
                  {group.applicants.map((applicant) => {
                    const charges = formatChargeFlags(applicant.jobseeker.charges)
                    return (
                      <div
                        className="flex flex-col gap-4 rounded-[24px] border border-[#e6dbc8] bg-[#fcfaf6] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                        key={applicant.application_id}
                      >
                        <div className="flex gap-4">
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#cbd5f1] bg-[#f2f6ff] text-base font-semibold text-[#2458b8]">
                            {getInitials(applicant.jobseeker.full_name)}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xl font-semibold text-slate-950">
                                {applicant.jobseeker.full_name ?? 'Applicant name pending'}
                              </p>
                              <p className="text-sm text-slate-500">
                                Applied {formatDate(applicant.applied_at)} ·{' '}
                                {formatTransitType(applicant.jobseeker.transit_type)} ·{' '}
                                {applicant.jobseeker.city ?? 'City pending'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {charges.length > 0 ? (
                                charges.map((charge) => (
                                  <PortalBadge className="font-medium" key={charge} tone="danger">
                                    {charge}
                                  </PortalBadge>
                                ))
                              ) : (
                                <PortalBadge tone="info">No disclosures</PortalBadge>
                              )}
                              <PortalBadge tone="info">
                                {applicant.jobseeker.status === 'hired' ? 'Hired' : 'Active'}
                              </PortalBadge>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <PortalBadge tone={getApplicationTone(applicant.status)}>
                            {formatStatusLabel(applicant.status)}
                          </PortalBadge>
                          <PortalButton
                            variant="secondary"
                            onClick={() => announceComingSoon('Express interest')}
                          >
                            Express interest
                          </PortalButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PortalPanel>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
