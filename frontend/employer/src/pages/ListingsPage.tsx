import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Button, Card, CardBody } from '@shared/ui/primitives'

import { listEmployerListings } from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ListingCard } from '../components/ListingCard'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import type { JobListing } from '../types/employer'

export function EmployerListingsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [reviewStatus, setReviewStatus] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState('')
  const [items, setItems] = useState<JobListing[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listEmployerListings(auth.requestTwa, {
      page,
      reviewStatus,
      lifecycleStatus,
    })
      .then((response) => {
        if (!active) return
        setItems(response.items)
        setTotalPages(response.meta.total_pages)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, lifecycleStatus, page, reviewStatus])

  const reviewGate = auth.authMe?.employer_review_status ?? 'pending'

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="stack-sm">
              <p className="portal-eyebrow">Listings</p>
              <h2 className="card-title">
                Monitor every job request you have sent to staff.
              </h2>
              <p className="card-copy">
                Each listing moves through review separately, even after your
                employer account is approved.
              </p>
            </div>
            <div className="inline-actions">
              <Link className="button button-primary" to="/listings/new">
                New listing
              </Link>
            </div>
          </div>

          {reviewGate !== 'approved' ? (
            <Alert tone={reviewGate === 'rejected' ? 'danger' : 'warning'}>
              <p>
                {reviewGate === 'rejected'
                  ? 'Your employer account is currently rejected, so new listings stay locked until staff reassesses the account.'
                  : 'Your employer account is still pending review, so you can monitor past listings but cannot submit a new one yet.'}
              </p>
            </Alert>
          ) : null}

          <div className="filter-grid">
            <label className="field">
              <span>Review status</span>
              <select
                className="status-filter"
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
            <label className="field">
              <span>Lifecycle</span>
              <select
                className="status-filter"
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
          </div>
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading employer listings..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Listings unavailable" message={error} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="No listings yet"
          message="Once your organization submits listings, they will appear here with review and lifecycle status."
        />
      ) : null}
      {!isLoading && !error && items.length > 0 ? (
        <div className="listing-grid">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing}>
              <Link
                className="button button-secondary"
                to={`/listings/${listing.id}`}
              >
                View listing
              </Link>
              <Link
                className="button button-ghost"
                to={`/listings/${listing.id}/applicants`}
              >
                Applicants
              </Link>
            </ListingCard>
          ))}
        </div>
      ) : null}

      {!isLoading && !error && totalPages > 1 ? (
        <Card strong>
          <CardBody>
            <div className="cluster pagination-row">
              <p className="card-copy">
                Page {page} of {totalPages}
              </p>
              <div className="inline-actions">
                <Button
                  disabled={page <= 1}
                  tone="secondary"
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
