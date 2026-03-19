import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Badge, Button, Card, CardBody, DataTable } from '@shared/ui/primitives'

import { listMyApplications } from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import type { ApplicationListItem } from '../types/jobseeker'

export function JobseekerApplicationsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<ApplicationListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void listMyApplications(auth.requestTwa, { page, status })
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
  }, [auth, page, status])

  return (
    <div className="page-frame stack-md shell-page">
      <JobseekerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stack-sm">
              <p className="eyebrow">My Applications</p>
              <h2 className="card-title">Track every listing you have applied to.</h2>
              <p className="card-copy">This view stays available even after you are hired for a specific listing.</p>
            </div>
            <select className="status-filter" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}>
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="hired">Hired</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading applications..." /> : null}
      {!isLoading && error ? <ErrorState title="Applications unavailable" message={error} /> : null}
      {!isLoading && !error && items.length === 0 ? <EmptyState title="No applications yet" message="Once you apply to a job, it will appear here with its current status." /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <Card strong>
          <CardBody className="stack-md">
            <DataTable
              columns={['Job', 'City', 'Status', 'Applied', 'Listing']}
              rows={items.map((item) => [
                item.job.title,
                item.job.city ?? 'Unknown',
                <Badge key={`${item.id}-status`} tone={item.status === 'hired' ? 'success' : item.status === 'reviewed' ? 'info' : 'warning'}>{item.status}</Badge>,
                new Date(item.applied_at).toLocaleDateString(),
                item.job.lifecycle_status,
              ])}
            />
          </CardBody>
        </Card>
      ) : null}

      {!isLoading && !error && totalPages > 1 ? (
        <Card strong>
          <CardBody>
            <div className="cluster pagination-row">
              <p className="card-copy">Page {page} of {totalPages}</p>
              <div className="inline-actions">
                <Button disabled={page <= 1} tone="secondary" onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
