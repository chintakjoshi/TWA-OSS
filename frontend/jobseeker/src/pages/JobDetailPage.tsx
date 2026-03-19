import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Button, Card, CardBody } from '@shared/ui/primitives'

import { createApplication, getVisibleJobDetail } from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import type { JobDetailPayload } from '../types/jobseeker'

export function JobseekerJobDetailPage() {
  const auth = useAuth()
  const { jobId = '' } = useParams()
  const [detail, setDetail] = useState<JobDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getVisibleJobDetail(auth.requestTwa, jobId)
      .then((response) => {
        if (!active) return
        setDetail(response)
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
  }, [auth, jobId])

  async function handleApply() {
    if (!detail) return
    setIsApplying(true)
    setError(null)
    setNotice(null)
    try {
      await createApplication(auth.requestTwa, detail.job.id)
      setNotice('Application submitted. You can track it in My Applications.')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to submit application right now.'
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="page-frame stack-md shell-page">
      <JobseekerHeader />
      {isLoading ? <LoadingState title="Loading job details..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Job unavailable" message={error} />
      ) : null}
      {!isLoading && !error && detail ? (
        <Card strong>
          <CardBody className="stack-md">
            <div
              className="cluster"
              style={{
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div className="stack-sm">
                <p className="eyebrow">Job Detail</p>
                <h2 className="card-title">{detail.job.title}</h2>
                <p className="card-copy">
                  {detail.job.city ?? 'City not set'}
                  {detail.job.zip ? `, ${detail.job.zip}` : ''}
                </p>
              </div>
              <Badge
                tone={detail.eligibility.is_eligible ? 'success' : 'warning'}
              >
                {detail.eligibility.is_eligible
                  ? 'Eligible'
                  : (detail.eligibility.ineligibility_tag ?? 'Not eligible')}
              </Badge>
            </div>

            {notice ? (
              <Alert tone="success">
                <p>{notice}</p>
              </Alert>
            ) : null}
            {error ? (
              <Alert tone="danger">
                <p>{error}</p>
              </Alert>
            ) : null}

            <div className="detail-grid">
              <div className="stack-sm">
                <h3 className="detail-heading">Description</h3>
                <p className="card-copy">
                  {detail.job.description ?? 'No description provided yet.'}
                </p>
              </div>
              <div className="stack-sm">
                <h3 className="detail-heading">Location</h3>
                <p className="card-copy">
                  {detail.job.location_address ?? 'Address not provided'}
                  {detail.job.city ? `, ${detail.job.city}` : ''}
                  {detail.job.zip ? ` ${detail.job.zip}` : ''}
                </p>
              </div>
              <div className="stack-sm">
                <h3 className="detail-heading">Transit</h3>
                <p className="card-copy">
                  Requirement:{' '}
                  {detail.job.transit_required === 'own_car'
                    ? 'Own car required'
                    : 'Any transit option'}
                  .
                </p>
                <p className="card-copy">
                  Transit accessible:{' '}
                  {detail.job.transit_accessible === null
                    ? 'Not computed yet'
                    : detail.job.transit_accessible
                      ? 'Yes'
                      : 'No'}
                  .
                </p>
              </div>
            </div>

            <div className="inline-actions">
              <Button
                disabled={!detail.eligibility.is_eligible || isApplying}
                onClick={() => void handleApply()}
              >
                {isApplying ? 'Submitting application...' : 'Apply now'}
              </Button>
              <Link className="button button-secondary" to="/applications">
                My Applications
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
