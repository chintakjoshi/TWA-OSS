import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Button, Card, CardBody, DataTable, Field } from '@shared/ui/primitives'

import { listAuditLog } from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatDateTime } from '../lib/formatting'
import type { AuditLogEntry } from '../types/admin'

export function AdminAuditLogPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [actorId, setActorId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listAuditLog(auth.requestTwa, { page, actorId, entityType, action, dateFrom, dateTo })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load audit entries.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [auth, page, actorId, entityType, action, dateFrom, dateTo])

  const rows = useMemo(
    () => items.map((item) => [
      item.action,
      item.entity_type,
      item.entity_id ?? 'None',
      item.actor_id ?? 'system',
      formatDateTime(item.timestamp),
    ]),
    [items],
  )

  return (
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="portal-eyebrow">Audit Log</p>
            <h2 className="card-title">Inspect every important write action.</h2>
            <p className="card-copy">System-generated actions intentionally appear with a null actor id.</p>
          </div>
          <div className="filter-grid">
            <Field label="Actor id"><input value={actorId} onChange={(event) => { setPage(1); setActorId(event.target.value) }} /></Field>
            <Field label="Entity type"><input value={entityType} onChange={(event) => { setPage(1); setEntityType(event.target.value) }} placeholder="employer, job_listing" /></Field>
            <Field label="Action"><input value={action} onChange={(event) => { setPage(1); setAction(event.target.value) }} placeholder="admin.listing_reviewed" /></Field>
            <Field label="Date from"><input type="datetime-local" value={dateFrom} onChange={(event) => { setPage(1); setDateFrom(event.target.value) }} /></Field>
            <Field label="Date to"><input type="datetime-local" value={dateTo} onChange={(event) => { setPage(1); setDateTo(event.target.value) }} /></Field>
          </div>
          <div className="inline-actions">
            <Button tone="secondary" onClick={() => { setPage(1); setActorId(''); setEntityType(''); setAction(''); setDateFrom(''); setDateTo('') }}>Clear filters</Button>
          </div>
          {error ? <Alert tone="danger"><p>{error}</p></Alert> : null}
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading audit entries..." /> : null}
      {!isLoading && error && items.length === 0 ? <ErrorState title="Audit log unavailable" message={error} /> : null}
      {!isLoading && items.length === 0 ? <EmptyState title="No audit entries found" message="Try adjusting the current filters." /> : null}
      {!isLoading && items.length > 0 ? (
        <Card strong>
          <CardBody className="stack-md">
            <DataTable columns={['Action', 'Entity type', 'Entity id', 'Actor', 'Timestamp']} rows={rows} />
            {totalPages > 1 ? (
              <div className="inline-actions">
                <Button disabled={page <= 1} tone="secondary" onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
