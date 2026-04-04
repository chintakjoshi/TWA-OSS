import { useEffect, useRef, useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import {
  getEmployerListing,
  listEmployerApplicants,
  listEmployerApplications,
  listEmployerListings,
} from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  InlineNotice,
  PortalBadge,
  PortalButton,
  PortalPanel,
  Surface,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'
import { isEmployerApplicantVisibilityEnabled } from '../lib/capabilities'
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

type ApplicantListingSummary = Pick<
  JobListing,
  'id' | 'title' | 'city' | 'review_status' | 'lifecycle_status'
>

type ApplicantGroup = {
  listing: ApplicantListingSummary
  applicants: EmployerApplicant[]
}

const PAGE_SIZE = 12

export function EmployerApplicantsPage() {
  const auth = useAuth()
  const applicantVisibilityEnabled = isEmployerApplicantVisibilityEnabled(
    auth.authMe
  )
  const { listingId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState(
    () => searchParams.get('search') ?? ''
  )
  const [groups, setGroups] = useState<ApplicantGroup[]>([])
  const [listingOptions, setListingOptions] = useState<
    ApplicantListingSummary[]
  >([])
  const [listingTotal, setListingTotal] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharingDisabled, setSharingDisabled] = useState(false)
  const hasLoadedOnceRef = useRef(false)

  const searchQuery = searchParams.get('search') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const listingFilter = listingId ?? searchParams.get('listing') ?? ''
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const reviewLocked = reviewStatus !== 'approved'

  useEffect(() => {
    if (searchDraft !== searchQuery) {
      setSearchDraft(searchQuery)
    }
  }, [searchDraft, searchQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchDraft.trim()
      if (nextSearch === searchQuery) return

      const nextParams = new URLSearchParams(searchParams)
      if (nextSearch) nextParams.set('search', nextSearch)
      else nextParams.delete('search')

      setPage(1)
      setSearchParams(nextParams, { replace: true })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchDraft, searchParams, searchQuery, setSearchParams])

  useEffect(() => {
    let active = true

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setSharingDisabled(false)

    async function loadApplicants() {
      const listingsResponse = await listEmployerListings(auth.requestTwa, {
        page: 1,
        pageSize: 100,
      })

      if (!active) return
      setListingTotal(listingsResponse.meta.total_items)
      setListingOptions(listingsResponse.items.filter(isListingVisible))
      if (reviewLocked) {
        setGroups([])
        setTotalItems(0)
        setTotalPages(0)
        hasLoadedOnceRef.current = true
        return
      }

      if (!applicantVisibilityEnabled) {
        setSharingDisabled(true)
        setGroups([])
        setTotalItems(0)
        setTotalPages(0)
        hasLoadedOnceRef.current = true
        return
      }

      if (listingId) {
        const [listingResponse, applicantsResponse] = await Promise.all([
          getEmployerListing(auth.requestTwa, listingId),
          listEmployerApplicants(auth.requestTwa, listingId, {
            page,
            pageSize: PAGE_SIZE,
            search: searchQuery || undefined,
            status: statusFilter || undefined,
          }),
        ])

        if (!active) return
        setGroups(
          applicantsResponse.items.length > 0
            ? [
                {
                  listing: listingResponse.listing,
                  applicants: applicantsResponse.items,
                },
              ]
            : []
        )
        setTotalItems(applicantsResponse.meta.total_items)
        setTotalPages(applicantsResponse.meta.total_pages)
        hasLoadedOnceRef.current = true
        return
      }

      const applicantsResponse = await listEmployerApplications(
        auth.requestTwa,
        {
          page,
          pageSize: PAGE_SIZE,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          listingId: listingFilter || undefined,
        }
      )

      if (!active) return

      const nextGroups = new Map<string, ApplicantGroup>()
      applicantsResponse.items.forEach((item) => {
        const existing = nextGroups.get(item.listing.id) ?? {
          listing: item.listing,
          applicants: [],
        }
        const { listing, ...applicant } = item
        existing.applicants.push(applicant)
        nextGroups.set(listing.id, existing)
      })

      setGroups(Array.from(nextGroups.values()))
      setTotalItems(applicantsResponse.meta.total_items)
      setTotalPages(applicantsResponse.meta.total_pages)
      hasLoadedOnceRef.current = true
    }

    void loadApplicants()
      .catch((nextError: unknown) => {
        if (!active) return
        if (
          nextError instanceof HttpError &&
          nextError.status === 403 &&
          nextError.code === 'APPLICANT_VISIBILITY_DISABLED'
        ) {
          setSharingDisabled(true)
          setGroups([])
          setTotalItems(0)
          setTotalPages(0)
          return
        }
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load employer applicants right now.'
        )
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      })

    return () => {
      active = false
    }
  }, [
    auth.requestTwa,
    listingFilter,
    listingId,
    page,
    applicantVisibilityEnabled,
    reviewLocked,
    searchQuery,
    statusFilter,
  ])

  function updateFilters(
    next: Partial<{
      listing: string
      status: string
    }>
  ) {
    const nextParams = new URLSearchParams(searchParams)

    if (next.status !== undefined) {
      if (next.status) nextParams.set('status', next.status)
      else nextParams.delete('status')
    }

    if (!listingId && next.listing !== undefined) {
      if (next.listing) nextParams.set('listing', next.listing)
      else nextParams.delete('listing')
    }

    setPage(1)
    setSearchParams(nextParams, { replace: true })
  }

  const hasActiveFilters = Boolean(searchQuery || statusFilter || listingFilter)

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
                  {reviewLocked
                    ? 'Applicant data stays locked until TWA approves your employer account.'
                    : 'Candidates matched to and applied for your visible TWA listings.'}
                </p>
              </div>
              {reviewLocked ? (
                <PortalBadge
                  tone={reviewStatus === 'rejected' ? 'danger' : 'info'}
                >
                  Applicant access locked
                </PortalBadge>
              ) : !sharingDisabled ? (
                <PortalBadge tone="success">
                  Applicant sharing enabled by TWA
                </PortalBadge>
              ) : null}
            </div>

            {!reviewLocked && !sharingDisabled ? (
              <>
                <div
                  className={`grid gap-4 ${
                    listingId
                      ? 'xl:grid-cols-[minmax(0,1.55fr)_220px]'
                      : 'xl:grid-cols-[minmax(0,1.45fr)_190px_220px]'
                  }`}
                >
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Search applicants
                    </span>
                    <div className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3">
                      <Search className="h-4 w-4 shrink-0 text-[#8da2c5]" />
                      <input
                        className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="Search name, city, or listing"
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Application status
                    </span>
                    <select
                      className="mt-2 min-h-11 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-sm text-slate-700"
                      value={statusFilter}
                      onChange={(event) =>
                        updateFilters({ status: event.target.value })
                      }
                    >
                      <option value="">All statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="hired">Hired</option>
                    </select>
                  </label>

                  {!listingId ? (
                    <label className="block">
                      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Listing
                      </span>
                      <select
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-sm text-slate-700"
                        value={listingFilter}
                        onChange={(event) =>
                          updateFilters({ listing: event.target.value })
                        }
                      >
                        <option value="">All listings</option>
                        {listingOptions.map((listing) => (
                          <option key={listing.id} value={listing.id}>
                            {listing.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <PortalBadge tone="info">
                    {totalItems} applicants found
                  </PortalBadge>
                  {isRefreshing ? (
                    <PortalBadge className="gap-2" tone="info">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#aac0ea] border-t-[#3569c7]" />
                      Updating applicants
                    </PortalBadge>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </PortalPanel>

        <div aria-busy={isLoading || isRefreshing}>
          {isLoading ? <LoadingState title="Loading applicants..." /> : null}
          {!isLoading && !reviewLocked && error && groups.length === 0 ? (
            <ErrorState title="Applicants unavailable" message={error} />
          ) : null}
          {!isLoading && !reviewLocked && error && groups.length > 0 ? (
            <InlineNotice tone="danger">{error}</InlineNotice>
          ) : null}
          {!isLoading && reviewLocked ? (
            <Surface className="border-[#ead8bb] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4e7_100%)] py-10 text-center">
              <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-[#d6e2ff] bg-[#f5f8ff] px-4 py-2 text-sm font-semibold text-[#3569c7] shadow-[0_10px_24px_rgba(53,105,199,0.08)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-[#3569c7]">
                  <Lock className="h-4 w-4" />
                </span>
                <span>Locked</span>
              </div>
              <h2 className="employer-display mt-6 text-[2rem] font-semibold text-slate-950">
                {reviewStatus === 'rejected'
                  ? 'Applicant access is unavailable until re-approval'
                  : 'Applicant access unlocks after approval'}
              </h2>
              <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-slate-500">
                {reviewStatus === 'rejected'
                  ? 'TWA staff removed approval for this employer account. You can still review your employer profile and listing history, but applicant data will stay hidden until the account is approved again.'
                  : 'TWA staff are still reviewing this employer account. You can review your employer profile and listing history while you wait, and applicant data will unlock after approval.'}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to="/profile">
                  <PortalButton variant="secondary">
                    Review profile
                  </PortalButton>
                </Link>
                <Link to="/my-listings">
                  <PortalButton variant="ghost">View listings</PortalButton>
                </Link>
              </div>
            </Surface>
          ) : null}
          {!isLoading && sharingDisabled ? (
            <Surface className="border-[#ead8bb] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4e7_100%)] py-10 text-center">
              <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-[#efd7a6] bg-[#fff4d9] px-4 py-2 text-sm font-semibold text-[#a76705] shadow-[0_10px_24px_rgba(176,114,0,0.08)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-[#b87200]">
                  <Lock className="h-4 w-4" />
                </span>
                <span>Locked</span>
              </div>
              <h2 className="employer-display mt-6 text-[2rem] font-semibold text-slate-950">
                Applicant visibility is currently off
              </h2>
              <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-slate-500">
                TWA staff control whether employers can view applicant
                information. When enabled, matched candidates for your listings
                will appear here.
              </p>
              <div className="mt-6 flex justify-center">
                <PortalButton
                  variant="secondary"
                  onClick={() =>
                    announceComingSoon('Applicant sharing preview')
                  }
                >
                  Preview with sharing enabled
                </PortalButton>
              </div>
            </Surface>
          ) : null}
          {!isLoading &&
          !reviewLocked &&
          !error &&
          !sharingDisabled &&
          groups.length === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? 'No applicants match these filters'
                  : 'No applicants to review yet'
              }
              message={
                hasActiveFilters
                  ? 'Try a different applicant name, city, application status, or listing.'
                  : 'Once approved listings receive applications, they will appear here grouped by listing.'
              }
            />
          ) : null}

          {!isLoading &&
          !reviewLocked &&
          !sharingDisabled &&
          groups.length > 0 ? (
            <div className="mt-8 space-y-8">
              {groups.map((group) => (
                <PortalPanel key={group.listing.id}>
                  <div className="border-b border-[#eadfce] px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
                          {group.listing.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {group.listing.city || 'Location pending'} -{' '}
                          {group.applicants.length} shown
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PortalBadge
                          tone={
                            group.listing.lifecycle_status === 'open'
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {group.listing.lifecycle_status === 'open'
                            ? 'Live'
                            : 'Closed'}
                        </PortalBadge>
                        <Link to={`/my-listings/${group.listing.id}`}>
                          <PortalButton variant="secondary">
                            Listing details
                          </PortalButton>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 px-6 py-6">
                    {group.applicants.map((applicant) => {
                      const charges = formatChargeFlags(
                        applicant.jobseeker.charges
                      )
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
                                  {applicant.jobseeker.full_name ??
                                    'Applicant name pending'}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Applied {formatDate(applicant.applied_at)} -{' '}
                                  {formatTransitType(
                                    applicant.jobseeker.transit_type
                                  )}{' '}
                                  - {applicant.jobseeker.city ?? 'City pending'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {charges.length > 0 ? (
                                  charges.map((charge) => (
                                    <PortalBadge
                                      className="font-medium"
                                      key={charge}
                                      tone="danger"
                                    >
                                      {charge}
                                    </PortalBadge>
                                  ))
                                ) : (
                                  <PortalBadge tone="info">
                                    No disclosures
                                  </PortalBadge>
                                )}
                                <PortalBadge tone="info">
                                  {applicant.jobseeker.status === 'hired'
                                    ? 'Hired'
                                    : 'Active'}
                                </PortalBadge>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-3 lg:items-end">
                            <PortalBadge
                              tone={getApplicationTone(applicant.status)}
                            >
                              {formatStatusLabel(applicant.status)}
                            </PortalBadge>
                            <PortalButton
                              variant="secondary"
                              onClick={() =>
                                announceComingSoon('Express interest')
                              }
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

          {!isLoading &&
          !reviewLocked &&
          !sharingDisabled &&
          groups.length > 0 &&
          totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-3">
                <PortalButton
                  disabled={page <= 1 || isRefreshing}
                  variant="secondary"
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </PortalButton>
                <PortalButton
                  disabled={page >= totalPages || isRefreshing}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </PortalButton>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
