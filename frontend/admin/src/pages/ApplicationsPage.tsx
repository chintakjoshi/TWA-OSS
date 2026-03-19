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

import { listApplications, updateApplication } from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { applicationTone, formatDateTime } from '../lib/formatting'
import type { AdminApplication } from '../types/admin'

export function AdminApplicationsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [items, setItems] = useState<AdminApplication[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminApplication | null>(null)
  const [status, setStatus] = useState<'submitted' | 'reviewed' | 'hired'>(
    'reviewed'
  )
  const [closeAfterHire, setCloseAfterHire] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listApplications(auth.requestTwa, {
        page,
        status: statusFilter,
      })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load applications.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, page, statusFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const rows = useMemo(
    () =>
      items.map((item) => [
        item.job.title,
        item.jobseeker.full_name ?? 'Name missing',
        <Badge key={`${item.id}-status`} tone={applicationTone(item.status)}>
          {item.status}
        </Badge>,
        formatDateTime(item.applied_at),
        <Button
          key={`${item.id}-update`}
          tone="secondary"
          onClick={() => {
            setSelected(item)
            setStatus(item.status)
            setCloseAfterHire(false)
          }}
        >
          Update
        </Button>,
      ]),
    [items]
  )

  async function handleSave() {
    if (!selected) return
    setIsSaving(true)
    try {
      await updateApplication(auth.requestTwa, selected.id, {
        status,
        close_listing_after_hire: closeAfterHire,
      })
      setSelected(null)
      await loadData()
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update application status.'
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
              <p className="portal-eyebrow">Applications</p>
              <h2 className="card-title">
                Track reviews, hires, and optional listing closure.
              </h2>
              <p className="card-copy">
                A hire is application-specific, and staff can optionally close
                the listing at the same time.
              </p>
            </div>
            <label className="field admin-inline-field">
              <span>Status</span>
              <select
                className="status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setPage(1)
                  setStatusFilter(event.target.value)
                }}
              >
                <option value="">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="hired">Hired</option>
              </select>
            </label>
          </div>
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading applications..." /> : null}
      {!isLoading && error && items.length === 0 ? (
        <ErrorState title="Applications unavailable" message={error} />
      ) : null}
      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="No applications found"
          message="Try clearing the current filter or wait for new submissions."
        />
      ) : null}
      {!isLoading && items.length > 0 ? (
        <Card strong>
          <CardBody className="stack-md">
            <DataTable
              columns={['Job', 'Jobseeker', 'Status', 'Applied', 'Action']}
              rows={rows}
            />
            {totalPages > 1 ? (
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
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={selected !== null}
        title={selected ? `Update ${selected.job.title}` : 'Update application'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="stack-md">
            <p className="card-copy">
              Jobseeker: {selected.jobseeker.full_name ?? selected.jobseeker.id}
            </p>
            <p className="card-copy">
              Applied: {formatDateTime(selected.applied_at)}
            </p>
            <Field label="Application status">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="hired">Hired</option>
              </select>
            </Field>
            <label className="charge-option">
              <input
                checked={closeAfterHire}
                type="checkbox"
                onChange={(event) => setCloseAfterHire(event.target.checked)}
              />
              <span>
                Close the listing after marking this application hired
              </span>
            </label>
            <div className="inline-actions">
              <Button disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'Saving...' : 'Save application status'}
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
