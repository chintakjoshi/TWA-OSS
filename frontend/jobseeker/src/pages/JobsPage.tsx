import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Button, Card, CardBody } from '@shared/ui/primitives'

import { listVisibleJobs } from '../api/jobseekerApi'
import { JobCard } from '../components/JobCard'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import type { JobListItem } from '../types/jobseeker'

export function JobseekerJobsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<JobListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listVisibleJobs(auth.requestTwa, page)
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
  }, [auth, page])

  return (
    <div className="page-frame stack-md shell-page">
      <JobseekerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="eyebrow">Job Board</p>
            <h2 className="card-title">
              Active listings that your current profile can evaluate.
            </h2>
            <p className="card-copy">
              The UI shows every active listing but disables apply when the
              current eligibility state is not a fit.
            </p>
          </div>
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading open jobs..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Jobs unavailable" message={error} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="No open jobs yet"
          message="TWA does not have any approved open listings to show right now."
        />
      ) : null}
      {!isLoading && !error && items.length > 0 ? (
        <div className="jobs-grid">
          {items.map((item) => (
            <JobCard item={item} key={item.job.id} />
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
