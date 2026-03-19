import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Card, CardBody } from '@shared/ui/primitives'

import { createEmployerListing } from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ListingForm } from '../components/ListingForm'

export function EmployerNewListingPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const blocked = reviewStatus !== 'approved'

  async function handleSubmit(
    values: Parameters<typeof createEmployerListing>[1]
  ) {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await createEmployerListing(auth.requestTwa, values)
      navigate(`/listings/${response.listing.id}`)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to submit the listing right now.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="portal-eyebrow">New Listing</p>
            <h2 className="card-title">Submit a job for staff review.</h2>
            <p className="card-copy">
              Every listing is reviewed individually before it becomes visible
              to jobseekers.
            </p>
          </div>

          {blocked ? (
            <Alert tone={reviewStatus === 'rejected' ? 'danger' : 'warning'}>
              <p>
                {reviewStatus === 'rejected'
                  ? 'Your employer account is rejected right now, so listing submission is locked until staff reassesses the account.'
                  : 'Your employer account is still pending review. Finish your profile and wait for staff approval before posting listings.'}
              </p>
            </Alert>
          ) : (
            <Alert tone="info">
              <p>
                After submission, staff can approve, reject, or later reassess
                this listing. Rejected listings remain visible here for
                tracking.
              </p>
            </Alert>
          )}

          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}

          {blocked ? (
            <div className="inline-actions">
              <Link className="button button-secondary" to="/dashboard">
                Back to dashboard
              </Link>
              <Link className="button button-ghost" to="/profile">
                Review employer profile
              </Link>
            </div>
          ) : (
            <ListingForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
          )}
        </CardBody>
      </Card>
    </div>
  )
}
