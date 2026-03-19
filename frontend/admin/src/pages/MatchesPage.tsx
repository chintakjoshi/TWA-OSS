import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  DataTable,
  Field,
} from '@shared/ui/primitives'

import {
  getMatchesForJobseeker,
  getMatchesForListing,
  listJobseekers,
  listListings,
} from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatStatusLabel } from '../lib/formatting'
import type {
  JobListing,
  JobseekerListItem,
  JobseekerMatchItem,
  ListingMatchItem,
} from '../types/admin'

export function AdminMatchesPage() {
  const auth = useAuth()
  const [jobseekers, setJobseekers] = useState<JobseekerListItem[]>([])
  const [listings, setListings] = useState<JobListing[]>([])
  const [selectedJobseekerId, setSelectedJobseekerId] = useState('')
  const [selectedListingId, setSelectedListingId] = useState('')
  const [jobMatches, setJobMatches] = useState<ListingMatchItem[]>([])
  const [jobseekerMatches, setJobseekerMatches] = useState<
    JobseekerMatchItem[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void Promise.all([
      listJobseekers(auth.requestTwa, { page: 1 }),
      listListings(auth.requestTwa, { page: 1 }),
    ])
      .then(([jobseekerResponse, listingResponse]) => {
        if (!active) return
        setJobseekers(jobseekerResponse.items)
        setListings(listingResponse.items)
        if (jobseekerResponse.items[0])
          setSelectedJobseekerId(jobseekerResponse.items[0].id)
        if (listingResponse.items[0])
          setSelectedListingId(listingResponse.items[0].id)
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
  }, [auth])

  async function runJobseekerMatch() {
    if (!selectedJobseekerId) return
    setError(null)
    try {
      const response = await getMatchesForJobseeker(
        auth.requestTwa,
        selectedJobseekerId
      )
      setJobMatches(response.items)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to run jobseeker match.'
      )
    }
  }

  async function runListingMatch() {
    if (!selectedListingId) return
    setError(null)
    try {
      const response = await getMatchesForListing(
        auth.requestTwa,
        selectedListingId
      )
      setJobseekerMatches(response.items)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to run listing match.'
      )
    }
  }

  return (
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="portal-eyebrow">Matches</p>
            <h2 className="card-title">
              Run both sides of the matching engine from the staff console.
            </h2>
            <p className="card-copy">
              Staff sees the full eligibility reasoning, including charge and
              transit mismatch explanations.
            </p>
          </div>
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading match inputs..." /> : null}
      {!isLoading &&
      error &&
      jobseekers.length === 0 &&
      listings.length === 0 ? (
        <ErrorState title="Match inputs unavailable" message={error} />
      ) : null}
      {!isLoading ? (
        <div className="admin-two-column-grid">
          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Jobs for a jobseeker</p>
                <h2 className="card-title">Start from the person side.</h2>
              </div>
              <Field label="Jobseeker">
                <select
                  value={selectedJobseekerId}
                  onChange={(event) =>
                    setSelectedJobseekerId(event.target.value)
                  }
                >
                  {jobseekers.map((jobseeker) => (
                    <option key={jobseeker.id} value={jobseeker.id}>
                      {jobseeker.full_name ?? jobseeker.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Button onClick={() => void runJobseekerMatch()}>
                Run job match
              </Button>
              {jobMatches.length === 0 ? (
                <EmptyState
                  title="No results yet"
                  message="Select a jobseeker and run the match to see eligibility results."
                />
              ) : (
                <DataTable
                  columns={['Job', 'City', 'Eligible', 'Reasons']}
                  rows={jobMatches.map((item) => [
                    item.job.title,
                    item.job.city ?? 'Unknown',
                    <Badge
                      key={`${item.job.id}-eligible`}
                      tone={item.is_eligible ? 'success' : 'warning'}
                    >
                      {item.is_eligible ? 'Yes' : 'No'}
                    </Badge>,
                    item.ineligibility_reasons.join(', ') ||
                      item.ineligibility_tag ||
                      'Eligible',
                  ])}
                />
              )}
            </CardBody>
          </Card>

          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Jobseekers for a listing</p>
                <h2 className="card-title">Start from the listing side.</h2>
              </div>
              <Field label="Listing">
                <select
                  value={selectedListingId}
                  onChange={(event) => setSelectedListingId(event.target.value)}
                >
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} -{' '}
                      {listing.employer?.org_name ?? 'Employer'}
                    </option>
                  ))}
                </select>
              </Field>
              <Button onClick={() => void runListingMatch()}>
                Run listing match
              </Button>
              {jobseekerMatches.length === 0 ? (
                <EmptyState
                  title="No results yet"
                  message="Select a listing and run the match to see compatible jobseekers."
                />
              ) : (
                <DataTable
                  columns={['Jobseeker', 'City', 'Eligible', 'Reasons']}
                  rows={jobseekerMatches.map((item) => [
                    item.jobseeker.full_name ?? item.jobseeker.id,
                    item.jobseeker.city ?? 'Unknown',
                    <Badge
                      key={`${item.jobseeker.id}-eligible`}
                      tone={item.is_eligible ? 'success' : 'warning'}
                    >
                      {item.is_eligible ? 'Yes' : 'No'}
                    </Badge>,
                    item.ineligibility_reasons
                      .map(formatStatusLabel)
                      .join(', ') || 'Eligible',
                  ])}
                />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
