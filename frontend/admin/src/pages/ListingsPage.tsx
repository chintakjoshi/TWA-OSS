import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { listEmployers, listListings, reviewListing } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import { useAdminShell } from '../components/layout/AdminShellProvider'
import {
  AdminButton,
  AdminPanel,
  DefinitionList,
  InlineNotice,
  Modal,
  PanelBody,
  PanelHeader,
  StatusBadge,
  TableCell,
  TableHeadRow,
  TableWrap,
  DataTable,
  inputClassName,
  tableActionButtonClassName,
  toolbarInputClassName,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { announceComingSoon } from '../lib/comingSoon'
import {
  formatChargeFlags,
  formatDateTime,
  formatTransitAccessibilityLabel,
  lifecycleTone,
  reviewTone,
  transitAccessibilityTone,
} from '../lib/formatting'
import type { EmployerProfile, JobListing } from '../types/admin'

export function AdminListingsPage() {
  const auth = useAuth()
  const { refreshSummary } = useAdminShell()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [employerFilter, setEmployerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [items, setItems] = useState<JobListing[]>([])
  const [employers, setEmployers] = useState<EmployerProfile[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<JobListing | null>(null)
  const [reviewStatus, setReviewStatus] = useState<
    'pending' | 'approved' | 'rejected'
  >('approved')
  const [lifecycleStatus, setLifecycleStatus] = useState<'open' | 'closed'>(
    'open'
  )
  const [reviewNote, setReviewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadListings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [listingResponse, employerResponse] = await Promise.all([
        listListings(auth.requestTwa, {
          page,
          pageSize: 12,
          lifecycleStatus:
            statusFilter === 'open' || statusFilter === 'closed'
              ? statusFilter
              : '',
          reviewStatus:
            statusFilter === 'pending' ||
            statusFilter === 'approved' ||
            statusFilter === 'rejected'
              ? statusFilter
              : '',
          employerId: employerFilter,
          search,
        }),
        listEmployers(auth.requestTwa, { page: 1, pageSize: 50 }),
      ])
      setItems(listingResponse.items)
      setTotalPages(listingResponse.meta.total_pages)
      setEmployers(employerResponse.items)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load listings.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, employerFilter, page, search, statusFilter])

  useEffect(() => {
    void loadListings()
  }, [loadListings])

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses' },
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
      { value: 'pending', label: 'Pending Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
    []
  )

  async function submitReview(
    listing: JobListing,
    nextReviewStatus: 'approved' | 'rejected' | 'pending',
    nextLifecycleStatus: 'open' | 'closed',
    note: string
  ) {
    setIsSaving(true)
    try {
      await reviewListing(auth.requestTwa, listing.id, {
        review_status: nextReviewStatus,
        lifecycle_status: nextLifecycleStatus,
        review_note: note,
      })
      toast.success(`Saved ${listing.title}.`)
      setSelected(null)
      await Promise.all([loadListings(), refreshSummary()])
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save listing changes.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout
      title="All Job Listings"
      primaryActionLabel="Add Listing"
      onPrimaryAction={() => announceComingSoon('Add Listing')}
    >
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading listings..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Listings unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <div className="grid gap-3 lg:grid-cols-[220px_160px_160px]">
                  <input
                    className={toolbarInputClassName}
                    placeholder="Search listings..."
                    value={search}
                    onChange={(event) => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
                  />
                  <select
                    className={toolbarInputClassName}
                    value={employerFilter}
                    onChange={(event) => {
                      setPage(1)
                      setEmployerFilter(event.target.value)
                    }}
                  >
                    <option value="">All Employers</option>
                    {employers.map((employer) => (
                      <option key={employer.id} value={employer.id}>
                        {employer.org_name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={toolbarInputClassName}
                    value={statusFilter}
                    onChange={(event) => {
                      setPage(1)
                      setStatusFilter(event.target.value)
                    }}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
              title="All Job Listings"
            />
            <PanelBody className="p-0">
              {items.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No listings found"
                    message="Try broadening the current filters."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Title</TableCell>
                          <TableCell header>Employer</TableCell>
                          <TableCell header>Location</TableCell>
                          <TableCell header>Transit</TableCell>
                          <TableCell header>Review</TableCell>
                          <TableCell header>Lifecycle</TableCell>
                          <TableCell header>Actions</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {items.map((listing) => (
                          <tr key={listing.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {listing.title}
                            </TableCell>
                            <TableCell>
                              {listing.employer?.org_name ?? 'Unknown employer'}
                            </TableCell>
                            <TableCell>{listing.city ?? 'Unknown'}</TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={transitAccessibilityTone(
                                  listing.transit_accessible
                                )}
                              >
                                {formatTransitAccessibilityLabel(
                                  listing.transit_accessible
                                )}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={reviewTone(listing.review_status)}
                              >
                                {listing.review_status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={lifecycleTone(listing.lifecycle_status)}
                              >
                                {listing.lifecycle_status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <AdminButton
                                className={tableActionButtonClassName}
                                variant="secondary"
                                onClick={() => {
                                  setSelected(listing)
                                  setReviewStatus(listing.review_status)
                                  setLifecycleStatus(listing.lifecycle_status)
                                  setReviewNote(listing.review_note ?? '')
                                }}
                              >
                                View
                              </AdminButton>
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </TableWrap>

                  {totalPages > 1 ? (
                    <div className="flex flex-wrap gap-3 px-6 py-5">
                      <AdminButton
                        disabled={page <= 1}
                        variant="secondary"
                        onClick={() => setPage((current) => current - 1)}
                      >
                        Previous
                      </AdminButton>
                      <AdminButton
                        disabled={page >= totalPages}
                        variant="secondary"
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </AdminButton>
                    </div>
                  ) : null}
                </>
              )}
            </PanelBody>
          </AdminPanel>
        ) : null}
      </div>

      <Modal
        open={selected !== null}
        title={selected ? selected.title : 'Listing details'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6">
            <DefinitionList
              items={[
                { label: 'Title', value: selected.title },
                {
                  label: 'Employer',
                  value: selected.employer?.org_name ?? 'Unknown employer',
                },
                {
                  label: 'Description',
                  value: selected.description ?? 'No description provided',
                },
                {
                  label: 'Location',
                  value:
                    [selected.location_address, selected.city, selected.zip]
                      .filter(Boolean)
                      .join(', ') || 'No address provided',
                },
                {
                  label: 'Transit accessible',
                  value: formatTransitAccessibilityLabel(
                    selected.transit_accessible
                  ),
                },
                {
                  label: 'Charges',
                  value:
                    formatChargeFlags(selected.disqualifying_charges).join(
                      ', '
                    ) || 'None',
                },
              ]}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                  htmlFor="all-listing-review-status"
                >
                  Review status
                </label>
                <select
                  className={inputClassName}
                  id="all-listing-review-status"
                  value={reviewStatus}
                  onChange={(event) =>
                    setReviewStatus(event.target.value as typeof reviewStatus)
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                  htmlFor="all-listing-lifecycle-status"
                >
                  Lifecycle status
                </label>
                <select
                  className={inputClassName}
                  id="all-listing-lifecycle-status"
                  value={lifecycleStatus}
                  onChange={(event) =>
                    setLifecycleStatus(
                      event.target.value as typeof lifecycleStatus
                    )
                  }
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={reviewTone(reviewStatus)}>
                {reviewStatus}
              </StatusBadge>
              <StatusBadge tone={lifecycleTone(lifecycleStatus)}>
                {lifecycleStatus}
              </StatusBadge>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                htmlFor="all-listing-review-note"
              >
                Staff note
              </label>
              <textarea
                className={`${inputClassName} min-h-36 py-3`}
                id="all-listing-review-note"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </div>

            <div className="text-sm text-slate-500">
              Created {formatDateTime(selected.created_at)} · Last reviewed{' '}
              {formatDateTime(selected.reviewed_at)}
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton
                disabled={isSaving}
                onClick={() =>
                  void submitReview(
                    selected,
                    reviewStatus,
                    lifecycleStatus,
                    reviewNote
                  )
                }
              >
                {isSaving ? 'Saving...' : 'Save listing'}
              </AdminButton>
              <AdminButton
                variant="warning"
                onClick={() => announceComingSoon('Request changes')}
              >
                Request Changes
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </AdminButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminWorkspaceLayout>
  )
}
