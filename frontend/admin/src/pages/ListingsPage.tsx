import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  DataTable,
  Field,
  Modal,
} from '@shared/ui/primitives'

import { listListingQueue, listListings, reviewListing } from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  formatChargeFlags,
  formatDate,
  formatDateTime,
  lifecycleTone,
  reviewTone,
} from '../lib/formatting'
import type { JobListing } from '../types/admin'

export function AdminListingsPage() {
  const auth = useAuth()
  const [queuePage, setQueuePage] = useState(1)
  const [allPage, setAllPage] = useState(1)
  const [reviewFilter, setReviewFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [queueItems, setQueueItems] = useState<JobListing[]>([])
  const [queuePages, setQueuePages] = useState(0)
  const [allItems, setAllItems] = useState<JobListing[]>([])
  const [allPages, setAllPages] = useState(0)
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

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [queue, all] = await Promise.all([
        listListingQueue(auth.requestTwa, queuePage),
        listListings(auth.requestTwa, {
          page: allPage,
          reviewStatus: reviewFilter,
          lifecycleStatus: lifecycleFilter,
        }),
      ])
      setQueueItems(queue.items)
      setQueuePages(queue.meta.total_pages)
      setAllItems(all.items)
      setAllPages(all.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load listing data right now.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, queuePage, allPage, reviewFilter, lifecycleFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const queueRows = useMemo(
    () =>
      queueItems.map((listing) => [
        listing.title,
        listing.employer?.org_name ?? 'Unknown employer',
        listing.city ?? 'Unknown',
        formatDate(listing.created_at),
        <Button
          key={`${listing.id}-queue`}
          onClick={() => {
            setSelected(listing)
            setReviewStatus(listing.review_status)
            setLifecycleStatus(listing.lifecycle_status)
            setReviewNote(listing.review_note ?? '')
          }}
        >
          Open review
        </Button>,
      ]),
    [queueItems]
  )

  const allRows = useMemo(
    () =>
      allItems.map((listing) => [
        listing.title,
        listing.employer?.org_name ?? 'Unknown employer',
        <Badge
          key={`${listing.id}-review`}
          tone={reviewTone(listing.review_status)}
        >
          {listing.review_status}
        </Badge>,
        <Badge
          key={`${listing.id}-life`}
          tone={lifecycleTone(listing.lifecycle_status)}
        >
          {listing.lifecycle_status}
        </Badge>,
        formatDate(listing.created_at),
        <Button
          key={`${listing.id}-manage`}
          tone="secondary"
          onClick={() => {
            setSelected(listing)
            setReviewStatus(listing.review_status)
            setLifecycleStatus(listing.lifecycle_status)
            setReviewNote(listing.review_note ?? '')
          }}
        >
          Manage
        </Button>,
      ]),
    [allItems]
  )

  async function handleSave() {
    if (!selected) return
    setIsSaving(true)
    try {
      await reviewListing(auth.requestTwa, selected.id, {
        review_status: reviewStatus,
        lifecycle_status: lifecycleStatus,
        review_note: reviewNote,
      })
      setSelected(null)
      await loadData()
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
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="stack-sm">
              <p className="portal-eyebrow">Listings</p>
              <h2 className="card-title">
                Review listings and manage lifecycle state after approval.
              </h2>
              <p className="card-copy">
                Staff can approve, reject, reassess later, and close listings
                when a role is filled or no longer needed.
              </p>
            </div>
            <div className="filter-grid compact-filter-grid">
              <label className="field admin-inline-field">
                <span>Review</span>
                <select
                  className="status-filter"
                  value={reviewFilter}
                  onChange={(event) => {
                    setAllPage(1)
                    setReviewFilter(event.target.value)
                  }}
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="field admin-inline-field">
                <span>Lifecycle</span>
                <select
                  className="status-filter"
                  value={lifecycleFilter}
                  onChange={(event) => {
                    setAllPage(1)
                    setLifecycleFilter(event.target.value)
                  }}
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
          </div>
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      {isLoading ? (
        <LoadingState title="Loading listing review queues..." />
      ) : null}
      {!isLoading &&
      error &&
      queueItems.length === 0 &&
      allItems.length === 0 ? (
        <ErrorState title="Listings unavailable" message={error} />
      ) : null}
      {!isLoading ? (
        <div className="admin-two-column-grid">
          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Pending queue</p>
                <h2 className="card-title">
                  Listings awaiting the first decision.
                </h2>
              </div>
              {queueItems.length === 0 ? (
                <EmptyState
                  title="No pending listings"
                  message="The listing approval queue is currently clear."
                />
              ) : (
                <DataTable
                  columns={['Listing', 'Employer', 'City', 'Created', 'Action']}
                  rows={queueRows}
                />
              )}
              {queuePages > 1 ? (
                <div className="inline-actions">
                  <Button
                    disabled={queuePage <= 1}
                    tone="secondary"
                    onClick={() => setQueuePage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={queuePage >= queuePages}
                    onClick={() => setQueuePage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Listing manager</p>
                <h2 className="card-title">
                  Full list for reassessment and closure.
                </h2>
              </div>
              {allItems.length === 0 ? (
                <EmptyState
                  title="No listings found"
                  message="Try clearing the current filters."
                />
              ) : (
                <DataTable
                  columns={[
                    'Listing',
                    'Employer',
                    'Review',
                    'Lifecycle',
                    'Created',
                    'Action',
                  ]}
                  rows={allRows}
                />
              )}
              {allPages > 1 ? (
                <div className="inline-actions">
                  <Button
                    disabled={allPage <= 1}
                    tone="secondary"
                    onClick={() => setAllPage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={allPage >= allPages}
                    onClick={() => setAllPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Modal
        open={selected !== null}
        title={selected ? `Manage ${selected.title}` : 'Manage listing'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="stack-md">
            <div className="detail-grid">
              <div className="stack-sm">
                <p className="card-copy">
                  Employer: {selected.employer?.org_name ?? 'Unknown employer'}
                </p>
                <p className="card-copy">
                  Location: {selected.location_address ?? 'No address'}
                  {selected.city ? `, ${selected.city}` : ''}
                  {selected.zip ? ` ${selected.zip}` : ''}
                </p>
                <p className="card-copy">
                  Charges:{' '}
                  {formatChargeFlags(selected.disqualifying_charges).join(
                    ', '
                  ) || 'None'}
                </p>
              </div>
              <div className="stack-sm">
                <p className="card-copy">
                  Transit accessible:{' '}
                  {selected.transit_accessible === null
                    ? 'Unknown'
                    : selected.transit_accessible
                      ? 'Yes'
                      : 'No'}
                </p>
                <p className="card-copy">
                  Created: {formatDateTime(selected.created_at)}
                </p>
                <p className="card-copy">
                  Last reviewed: {formatDateTime(selected.reviewed_at)}
                </p>
              </div>
            </div>
            <Field label="Review status">
              <select
                value={reviewStatus}
                onChange={(event) =>
                  setReviewStatus(event.target.value as typeof reviewStatus)
                }
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Lifecycle status">
              <select
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
            </Field>
            <Field label="Staff note">
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </Field>
            <div className="inline-actions">
              <Button disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'Saving...' : 'Save listing decision'}
              </Button>
              <Button tone="secondary" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
