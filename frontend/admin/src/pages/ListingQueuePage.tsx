import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { listListingQueue, reviewListing } from '../api/adminApi'
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
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { announceComingSoon } from '../lib/comingSoon'
import {
  formatChargeFlags,
  formatDate,
  formatDateTime,
  formatTransitAccessibilityLabel,
  lifecycleTone,
  reviewTone,
  transitAccessibilityTone,
} from '../lib/formatting'
import type { JobListing } from '../types/admin'

export function AdminListingQueuePage() {
  const auth = useAuth()
  const { refreshSummary, summary } = useAdminShell()
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<JobListing[]>([])
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

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listListingQueue(auth.requestTwa, page)
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load pending listings.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, page])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

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
      await Promise.all([loadQueue(), refreshSummary()])
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save listing review.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout
      title="Listing Review Queue"
      primaryActionLabel="Add Listing"
      onPrimaryAction={() => announceComingSoon('Add Listing')}
    >
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading listing queue..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Listing queue unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <StatusBadge tone="warning">
                  {summary?.pending_listings ?? items.length} Awaiting Review
                </StatusBadge>
              }
              title="Pending Job Listing Reviews"
            />
            <PanelBody className="p-0">
              {items.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No pending listings"
                    message="The listing review queue is clear right now."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Job Title</TableCell>
                          <TableCell header>Employer</TableCell>
                          <TableCell header>Location</TableCell>
                          <TableCell header>Transit OK</TableCell>
                          <TableCell header>Disqualifying Charges</TableCell>
                          <TableCell header>Submitted</TableCell>
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
                            <TableCell>
                              {[listing.city, listing.zip]
                                .filter(Boolean)
                                .join(', ') || 'Unknown'}
                            </TableCell>
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
                              <div className="flex flex-wrap gap-2">
                                {formatChargeFlags(
                                  listing.disqualifying_charges
                                ).length > 0 ? (
                                  formatChargeFlags(
                                    listing.disqualifying_charges
                                  ).map((charge) => (
                                    <StatusBadge key={charge} tone="danger">
                                      {charge}
                                    </StatusBadge>
                                  ))
                                ) : (
                                  <span className="text-slate-400">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(listing.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <AdminButton
                                  className={tableActionButtonClassName}
                                  variant="success"
                                  onClick={() =>
                                    void submitReview(
                                      listing,
                                      'approved',
                                      'open',
                                      ''
                                    )
                                  }
                                >
                                  Approve
                                </AdminButton>
                                <AdminButton
                                  className={tableActionButtonClassName}
                                  variant="warning"
                                  onClick={() =>
                                    announceComingSoon('Request changes')
                                  }
                                >
                                  Request Changes
                                </AdminButton>
                                <AdminButton
                                  className={tableActionButtonClassName}
                                  variant="danger"
                                  onClick={() =>
                                    void submitReview(
                                      listing,
                                      'rejected',
                                      listing.lifecycle_status,
                                      ''
                                    )
                                  }
                                >
                                  Reject
                                </AdminButton>
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
                                  Review
                                </AdminButton>
                              </div>
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
        title={selected ? `Review ${selected.title}` : 'Listing review'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6">
            <DefinitionList
              items={[
                { label: 'Job Title', value: selected.title },
                {
                  label: 'Employer',
                  value: selected.employer?.org_name ?? 'Unknown employer',
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
                  label: 'Created',
                  value: formatDateTime(selected.created_at),
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
                  htmlFor="listing-review-status"
                >
                  Review status
                </label>
                <select
                  className={inputClassName}
                  id="listing-review-status"
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
                  htmlFor="listing-lifecycle-status"
                >
                  Lifecycle status
                </label>
                <select
                  className={inputClassName}
                  id="listing-lifecycle-status"
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
                htmlFor="listing-review-note"
              >
                Staff note
              </label>
              <textarea
                className={`${inputClassName} min-h-36 py-3`}
                id="listing-review-note"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
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
                {isSaving ? 'Saving...' : 'Save listing decision'}
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminWorkspaceLayout>
  )
}
