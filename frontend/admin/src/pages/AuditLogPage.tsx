import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'

import { listAuditLog } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import {
  AdminButton,
  AdminPanel,
  InlineNotice,
  PanelBody,
  PanelHeader,
  StatusBadge,
  TableCell,
  TableHeadRow,
  TableWrap,
  DataTable,
  inputClassName,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  describeAuditAction,
  formatDateTime,
  formatStatusLabel,
} from '../lib/formatting'
import type { AuditLogEntry } from '../types/admin'

function describeAuditDetails(entry: AuditLogEntry) {
  if (entry.entity_type === 'system') {
    return entry.action === 'gtfs_feed_refreshed'
      ? 'Metro STL transit feed refreshed'
      : 'Background system event'
  }

  if (
    entry.new_value &&
    typeof entry.new_value === 'object' &&
    'review_status' in entry.new_value
  ) {
    return `Review status changed to ${String(entry.new_value.review_status)}`
  }

  if (
    entry.new_value &&
    typeof entry.new_value === 'object' &&
    'status' in entry.new_value
  ) {
    return `Status changed to ${String(entry.new_value.status)}`
  }

  return `${formatStatusLabel(entry.entity_type)} ${entry.entity_id ? entry.entity_id.slice(0, 8) : ''}`.trim()
}

export function AdminAuditLogPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listAuditLog(auth.requestTwa, {
        page,
        pageSize: 15,
        action: actionFilter,
        actorId: actorFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : '',
      })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load audit entries.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, actorFilter, auth.requestTwa, dateFrom, page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) =>
      [
        item.action,
        item.entity_type,
        item.actor_id ?? 'system',
        describeAuditAction(item.action),
        describeAuditDetails(item),
      ].some((value) => value.toLowerCase().includes(query))
    )
  }, [items, search])

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'employer.approved', label: 'Employer approved' },
    { value: 'employer.rejected', label: 'Employer rejected' },
    { value: 'listing.approved', label: 'Listing approved' },
    { value: 'listing.rejected', label: 'Listing rejected' },
    { value: 'application.submitted', label: 'Application submitted' },
    { value: 'application.hired', label: 'Application hired' },
    { value: 'admin.jobseeker_updated', label: 'Jobseeker updated' },
    { value: 'gtfs_feed_refreshed', label: 'GTFS refreshed' },
  ]

  return (
    <AdminWorkspaceLayout title="Audit Log">
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading audit log..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Audit log unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <div className="grid gap-3 xl:grid-cols-[200px_180px_220px_180px]">
                  <input
                    className={inputClassName}
                    placeholder="Search actions, ids..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <select
                    className={inputClassName}
                    value={actionFilter}
                    onChange={(event) => {
                      setPage(1)
                      setActionFilter(event.target.value)
                    }}
                  >
                    {actionOptions.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClassName}
                    placeholder="Actor id or blank for all"
                    value={actorFilter}
                    onChange={(event) => {
                      setPage(1)
                      setActorFilter(event.target.value)
                    }}
                  />
                  <input
                    className={inputClassName}
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setPage(1)
                      setDateFrom(event.target.value)
                    }}
                  />
                </div>
              }
              title="Audit Log"
            />
            <PanelBody className="p-0">
              {visibleItems.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No audit entries found"
                    message="Try broadening the current filters."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Timestamp</TableCell>
                          <TableCell header>Actor</TableCell>
                          <TableCell header>Action</TableCell>
                          <TableCell header>Entity Type</TableCell>
                          <TableCell header>Description</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {visibleItems.map((item) => (
                          <tr key={item.id}>
                            <TableCell>
                              {formatDateTime(item.timestamp)}
                            </TableCell>
                            <TableCell>{item.actor_id ?? 'system'}</TableCell>
                            <TableCell>
                              <StatusBadge tone="info">
                                {describeAuditAction(item.action)}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              {formatStatusLabel(item.entity_type)}
                            </TableCell>
                            <TableCell>{describeAuditDetails(item)}</TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </TableWrap>

                  {totalPages > 1 ? (
                    <div className="flex flex-wrap gap-3 px-6 py-5">
                      <AdminButton
                        disabled={page <= 1}
                        variant="secondary"
                        onClick={() => setPage((current) => current - 1)}
                      >
                        Previous
                      </AdminButton>
                      <AdminButton
                        disabled={page >= totalPages}
                        variant="secondary"
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </AdminButton>
                    </div>
                  ) : null}
                </>
              )}
            </PanelBody>
          </AdminPanel>
        ) : null}
      </div>
    </AdminWorkspaceLayout>
  )
}
