import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Button, Card, CardBody, DataTable, Field, Modal } from '@shared/ui/primitives'

import { listEmployerQueue, listEmployers, reviewEmployer } from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatDate, formatDateTime, reviewTone } from '../lib/formatting'
import type { EmployerProfile } from '../types/admin'

export function AdminEmployersPage() {
  const auth = useAuth()
  const [queuePage, setQueuePage] = useState(1)
  const [allPage, setAllPage] = useState(1)
  const [reviewFilter, setReviewFilter] = useState('')
  const [queueItems, setQueueItems] = useState<EmployerProfile[]>([])
  const [queuePages, setQueuePages] = useState(0)
  const [allItems, setAllItems] = useState<EmployerProfile[]>([])
  const [allPages, setAllPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EmployerProfile | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'approved' | 'rejected'>('approved')
  const [reviewNote, setReviewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const [queue, all] = await Promise.all([
        listEmployerQueue(auth.requestTwa, queuePage),
        listEmployers(auth.requestTwa, { page: allPage, reviewStatus: reviewFilter }),
      ])
      setQueueItems(queue.items)
      setQueuePages(queue.meta.total_pages)
      setAllItems(all.items)
      setAllPages(all.meta.total_pages)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load employer data right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [auth, queuePage, allPage, reviewFilter])

  const employerRows = useMemo(
    () => allItems.map((employer) => [
      employer.org_name,
      employer.contact_name ?? 'No contact',
      <Badge key={`${employer.id}-status`} tone={reviewTone(employer.review_status)}>{employer.review_status}</Badge>,
      employer.city ?? 'Unknown',
      formatDate(employer.created_at),
      <Button key={`${employer.id}-review`} tone="secondary" onClick={() => {
        setSelected(employer)
        setReviewStatus(employer.review_status)
        setReviewNote(employer.review_note ?? '')
      }}>Review</Button>,
    ]),
    [allItems],
  )

  const queueRows = useMemo(
    () => queueItems.map((employer) => [
      employer.org_name,
      employer.contact_name ?? 'No contact',
      employer.phone ?? 'No phone',
      employer.city ?? 'Unknown',
      formatDate(employer.created_at),
      <Button key={`${employer.id}-queue`} onClick={() => {
        setSelected(employer)
        setReviewStatus(employer.review_status)
        setReviewNote(employer.review_note ?? '')
      }}>Open review</Button>,
    ]),
    [queueItems],
  )

  async function handleReviewSave() {
    if (!selected) return
    setIsSaving(true)
    try {
      await reviewEmployer(auth.requestTwa, selected.id, { review_status: reviewStatus, review_note: reviewNote })
      setSelected(null)
      await loadData()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save employer review.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stack-sm">
              <p className="portal-eyebrow">Employers</p>
              <h2 className="card-title">Review employer accounts and revisit previous decisions.</h2>
              <p className="card-copy">Rejected employers can be reassessed later, so the full list stays visible alongside the pending queue.</p>
            </div>
            <label className="field admin-inline-field">
              <span>Filter full list</span>
              <select className="status-filter" value={reviewFilter} onChange={(event) => { setAllPage(1); setReviewFilter(event.target.value) }}>
                <option value="">All review states</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          {error ? <Alert tone="danger"><p>{error}</p></Alert> : null}
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading employer review queues..." /> : null}
      {!isLoading && error && queueItems.length === 0 && allItems.length === 0 ? <ErrorState title="Employers unavailable" message={error} /> : null}
      {!isLoading ? (
        <div className="admin-two-column-grid">
          <Card strong>
            <CardBody className="stack-md">
              <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stack-sm">
                  <p className="eyebrow">Pending queue</p>
                  <h2 className="card-title">Accounts waiting for staff review.</h2>
                </div>
                <Badge tone="warning">{queueItems.length} on page</Badge>
              </div>
              {queueItems.length === 0 ? <EmptyState title="No pending employers" message="The employer approval queue is currently clear." /> : <DataTable columns={['Organization', 'Contact', 'Phone', 'City', 'Created', 'Action']} rows={queueRows} />}
              {queuePages > 1 ? (
                <div className="inline-actions">
                  <Button disabled={queuePage <= 1} tone="secondary" onClick={() => setQueuePage((current) => current - 1)}>Previous</Button>
                  <Button disabled={queuePage >= queuePages} onClick={() => setQueuePage((current) => current + 1)}>Next</Button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card strong>
            <CardBody className="stack-md">
              <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stack-sm">
                  <p className="eyebrow">Full employer list</p>
                  <h2 className="card-title">Review history stays visible for reassessment.</h2>
                </div>
                <Badge tone="info">{allItems.length} on page</Badge>
              </div>
              {allItems.length === 0 ? <EmptyState title="No employers found" message="Try clearing the current filter or create more seed data." /> : <DataTable columns={['Organization', 'Contact', 'Status', 'City', 'Created', 'Action']} rows={employerRows} />}
              {allPages > 1 ? (
                <div className="inline-actions">
                  <Button disabled={allPage <= 1} tone="secondary" onClick={() => setAllPage((current) => current - 1)}>Previous</Button>
                  <Button disabled={allPage >= allPages} onClick={() => setAllPage((current) => current + 1)}>Next</Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Modal open={selected !== null} title={selected ? `Review ${selected.org_name}` : 'Review employer'} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="stack-md">
            <div className="detail-grid">
              <div className="stack-sm">
                <p className="card-copy">Contact: {selected.contact_name ?? 'No contact'}</p>
                <p className="card-copy">Phone: {selected.phone ?? 'No phone'}</p>
                <p className="card-copy">Address: {selected.address ?? 'No address'}{selected.city ? `, ${selected.city}` : ''}{selected.zip ? ` ${selected.zip}` : ''}</p>
              </div>
              <div className="stack-sm">
                <p className="card-copy">Current status: {selected.review_status}</p>
                <p className="card-copy">Created: {formatDateTime(selected.created_at)}</p>
                <p className="card-copy">Last reviewed: {formatDateTime(selected.reviewed_at)}</p>
              </div>
            </div>
            <Field label="Review status">
              <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Staff note">
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
            </Field>
            <div className="inline-actions">
              <Button disabled={isSaving} onClick={() => void handleReviewSave()}>{isSaving ? 'Saving...' : 'Save review'}</Button>
              <Button tone="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
