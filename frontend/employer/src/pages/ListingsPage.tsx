import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import {
  listEmployerApplicants,
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
  formatDate,
  formatTransitRequirement,
  getStatusTone,
} from '../lib/formatting'
import type { JobListing } from '../types/employer'

const PAGE_SIZE = 20
const DEFAULT_SORT = 'created_at:desc'

export function EmployerListingsPage() {
  const auth = useAuth()
  const applicantVisibilityEnabled = isEmployerApplicantVisibilityEnabled(
    auth.authMe
  )
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState('')
  const [sortValue, setSortValue] = useState(DEFAULT_SORT)
  const [items, setItems] = useState<JobListing[]>([])
  const [listingCount, setListingCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applicantCounts, setApplicantCounts] = useState<
    Record<string, number | null>
  >({})
  const hasLoadedOnceRef = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setSearchQuery(searchDraft.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchDraft])

  useEffect(() => {
    let active = true
    const [sortBy, order] = sortValue.split(':') as [string, 'asc' | 'desc']

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    async function loadListings() {
      const response = await listEmployerListings(auth.requestTwa, {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        reviewStatus,
        lifecycleStatus,
        sort: sortBy,
        order,
      })

      if (!active) return
      setItems(response.items)
      setListingCount(response.meta.total_items)
      setTotalPages(response.meta.total_pages)

      const reviewGate = auth.authMe?.employer_review_status ?? 'pending'
      if (reviewGate !== 'approved') {
        setApplicantCounts({})
        hasLoadedOnceRef.current = true
        return
      }

      if (!applicantVisibilityEnabled) {
        setApplicantCounts({})
        hasLoadedOnceRef.current = true
        return
      }

      const nextCounts: Record<string, number | null> = {}
      await Promise.all(
        response.items.map(async (listing) => {
          if (
            listing.review_status !== 'approved' ||
            listing.lifecycle_status !== 'open'
          ) {
            nextCounts[listing.id] = null
            return
          }

          try {
            const applicants = await listEmployerApplicants(
              auth.requestTwa,
              listing.id,
              { page: 1, pageSize: 1 }
            )
            nextCounts[listing.id] = applicants.meta.total_items
          } catch (nextError) {
            if (
              nextError instanceof HttpError &&
              nextError.status === 403 &&
              nextError.code === 'APPLICANT_VISIBILITY_DISABLED'
            ) {
              nextCounts[listing.id] = null
              return
            }
            throw nextError
          }
        })
      )

      if (!active) return
      setApplicantCounts(nextCounts)
      hasLoadedOnceRef.current = true
    }

    void loadListings()
      .catch((nextError: unknown) => {
        if (!active) return
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load employer listings right now.'
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
    auth.authMe?.employer_review_status,
    auth.requestTwa,
    applicantVisibilityEnabled,
    lifecycleStatus,
    page,
    reviewStatus,
    searchQuery,
    sortValue,
  ])

  const reviewGate = auth.authMe?.employer_review_status ?? 'pending'
  const highlightedRejected = useMemo(
    () =>
      items.find(
        (listing) => listing.review_status === 'rejected' && listing.review_note
      ),
    [items]
  )

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader listingCount={listingCount} />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 lg:px-8">
        <PortalPanel>
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="employer-display text-[2.4rem] leading-[1.02] font-semibold text-slate-950">
                  My listings
                </h1>
                <p className="mt-3 text-base leading-8 text-slate-500">
                  Track every listing you have submitted, including pending
                  reviews, approved jobs, and rejected requests.
                </p>
              </div>
              <Link to="/submit-listing">
                <PortalButton>Submit New Listing</PortalButton>
              </Link>
            </div>

            {reviewGate !== 'approved' ? (
              <InlineNotice
                tone={reviewGate === 'rejected' ? 'danger' : 'info'}
              >
                {reviewGate === 'rejected'
                  ? 'Your employer account is currently not approved, so new listing submission remains locked until staff reassesses the account.'
                  : 'Your employer account is still pending review. You can monitor previous listings here, but new submissions stay locked until approval.'}
              </InlineNotice>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_150px_150px_170px]">
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Search listings
                </span>
                <div className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-[#ddcfba] bg-white px-3">
                  <Search className="h-4 w-4 shrink-0 text-[#8da2c5]" />
                  <input
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="Search job title or location"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Review status
                </span>
                <select
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-sm text-slate-700"
                  value={reviewStatus}
                  onChange={(event) => {
                    setPage(1)
                    setReviewStatus(event.target.value)
                  }}
                >
                  <option value="">All review states</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Lifecycle
                </span>
                <select
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-sm text-slate-700"
                  value={lifecycleStatus}
                  onChange={(event) => {
                    setPage(1)
                    setLifecycleStatus(event.target.value)
                  }}
                >
                  <option value="">All lifecycle states</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Sort by
                </span>
                <select
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-sm text-slate-700"
                  value={sortValue}
                  onChange={(event) => {
                    setPage(1)
                    setSortValue(event.target.value)
                  }}
                >
                  <option value="created_at:desc">Newest first</option>
                  <option value="created_at:asc">Oldest first</option>
                  <option value="updated_at:desc">Recently updated</option>
                  <option value="title:asc">Title A-Z</option>
                  <option value="title:desc">Title Z-A</option>
                  <option value="city:asc">Location A-Z</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PortalBadge tone="info">
                {listingCount} listings matching your filters
              </PortalBadge>
              {isRefreshing ? (
                <PortalBadge className="gap-2" tone="info">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#aac0ea] border-t-[#3569c7]" />
                  Updating listings
                </PortalBadge>
              ) : null}
            </div>
          </div>
        </PortalPanel>

        <div aria-busy={isLoading || isRefreshing}>
          {isLoading ? (
            <LoadingState title="Loading employer listings..." />
          ) : null}
          {!isLoading && error && items.length === 0 ? (
            <ErrorState title="Listings unavailable" message={error} />
          ) : null}
          {!isLoading && error && items.length > 0 ? (
            <InlineNotice tone="danger">{error}</InlineNotice>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            searchQuery || reviewStatus || lifecycleStatus ? (
              <EmptyState
                title="No listings match these filters"
                message="Try a different job title, location, review state, or lifecycle state."
              />
            ) : (
              <EmptyState
                title="No listings yet"
                message="Once your organization submits listings, they will appear here with review and lifecycle status."
              />
            )
          ) : null}

          {!isLoading && items.length > 0 ? (
            <PortalPanel className="mt-8">
              <div className="border-b border-[#eadfce] px-6 py-5">
                <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
                  All listings
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fbf8f1] text-xs uppercase tracking-[0.16em] text-[#8da2c5]">
                    <tr>
                      <th className="px-6 py-4">Job title</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Transit</th>
                      <th className="px-6 py-4">Applicants</th>
                      <th className="px-6 py-4">Submitted</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((listing) => (
                      <tr
                        className="border-t border-[#eadfce]"
                        key={listing.id}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {listing.title}
                            </p>
                            <p className="text-slate-500">
                              {listing.review_note
                                ? 'Staff note attached'
                                : 'No staff note'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {listing.city || 'Location pending'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatTransitRequirement(listing.transit_required)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {applicantCounts[listing.id] === null ||
                          applicantCounts[listing.id] === undefined
                            ? 'Locked'
                            : applicantCounts[listing.id]}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(listing.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <PortalBadge
                              tone={getStatusTone(listing.review_status)}
                            >
                              {listing.review_status === 'approved'
                                ? 'Approved'
                                : listing.review_status === 'rejected'
                                  ? 'Changes requested'
                                  : 'Under review'}
                            </PortalBadge>
                            <PortalBadge
                              tone={getStatusTone(listing.lifecycle_status)}
                            >
                              {listing.lifecycle_status === 'open'
                                ? 'Live'
                                : 'Closed'}
                            </PortalBadge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/my-listings/${listing.id}`}>
                              <PortalButton variant="secondary">
                                View
                              </PortalButton>
                            </Link>
                            {reviewGate === 'approved' &&
                            listing.review_status === 'approved' &&
                            listing.lifecycle_status === 'open' ? (
                              <>
                                <Link to={`/listings/${listing.id}/applicants`}>
                                  <PortalButton variant="ghost">
                                    Applicants
                                  </PortalButton>
                                </Link>
                                <PortalButton
                                  variant="danger"
                                  onClick={() =>
                                    announceComingSoon('Close listing')
                                  }
                                >
                                  Close
                                </PortalButton>
                              </>
                            ) : null}
                            {listing.review_status === 'pending' ? (
                              <span className="inline-flex items-center text-sm text-slate-400">
                                Awaiting TWA approval
                              </span>
                            ) : null}
                            {listing.review_status === 'rejected' ? (
                              <PortalButton
                                onClick={() =>
                                  announceComingSoon('Edit and resubmit')
                                }
                              >
                                Edit &amp; Resubmit
                              </PortalButton>
                            ) : null}
                            {listing.lifecycle_status === 'closed' ? (
                              <PortalButton
                                variant="secondary"
                                onClick={() =>
                                  announceComingSoon('Reactivate listing')
                                }
                              >
                                Reactivate
                              </PortalButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PortalPanel>
          ) : null}

          {highlightedRejected ? (
            <Surface className="mt-8 bg-[#fff5d6]">
              <h2 className="text-lg font-semibold text-[#9a5f00]">
                Changes requested: {highlightedRejected.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#9a5f00]">
                {highlightedRejected.review_note}
              </p>
              <div className="mt-5">
                <PortalButton
                  onClick={() => announceComingSoon('Edit and resubmit')}
                >
                  Edit &amp; Resubmit
                </PortalButton>
              </div>
            </Surface>
          ) : null}

          {!isLoading && items.length > 0 && totalPages > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
