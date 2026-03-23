import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { listApplications, updateApplication } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import { useAdminShell } from '../components/layout/AdminShellProvider'
import {
  AdminButton,
  AdminPanel,
  InlineNotice,
  Modal,
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
import { applicationTone, formatDate } from '../lib/formatting'
import type { AdminApplication } from '../types/admin'

export function AdminApplicationsPage() {
  const auth = useAuth()
  const { refreshSummary } = useAdminShell()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<AdminApplication[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminApplication | null>(null)
  const [status, setStatus] = useState<'submitted' | 'reviewed' | 'hired'>('reviewed')
  const [closeAfterHire, setCloseAfterHire] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listApplications(auth.requestTwa, {
        page,
        pageSize: 12,
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

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) =>
      [item.job.title, item.jobseeker.full_name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    )
  }, [items, search])

  async function handleSave(
    application: AdminApplication,
    nextStatus: 'submitted' | 'reviewed' | 'hired',
    closeListing: boolean
  ) {
    setIsSaving(true)
    try {
      await updateApplication(auth.requestTwa, application.id, {
        status: nextStatus,
        close_listing_after_hire: closeListing,
      })
      toast.success('Application updated.')
      setSelected(null)
      await Promise.all([loadData(), refreshSummary()])
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update application.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout title="Application Tracker">
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading applications..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Applications unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <div className="grid gap-3 md:grid-cols-[180px_160px]">
                  <input
                    className={inputClassName}
                    placeholder="Search..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <select
                    className={inputClassName}
                    value={statusFilter}
                    onChange={(event) => {
                      setPage(1)
                      setStatusFilter(event.target.value)
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
              }
              title="All Applications"
            />
            <PanelBody className="p-0">
              {visibleItems.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No applications found"
                    message="Try broadening the current filter."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Jobseeker</TableCell>
                          <TableCell header>Job Title</TableCell>
                          <TableCell header>Applied</TableCell>
                          <TableCell header>Status</TableCell>
                          <TableCell header>Actions</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {visibleItems.map((item) => (
                          <tr key={item.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {item.jobseeker.full_name ?? item.jobseeker.id}
                            </TableCell>
                            <TableCell>{item.job.title}</TableCell>
                            <TableCell>{formatDate(item.applied_at)}</TableCell>
                            <TableCell>
                              <StatusBadge tone={applicationTone(item.status)}>
                                {item.status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {item.status !== 'hired' ? (
                                  <AdminButton
                                    variant="success"
                                    onClick={() =>
                                      void handleSave(item, 'hired', false)
                                    }
                                  >
                                    Mark Hired
                                  </AdminButton>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    Hired
                                  </span>
                                )}
                                <AdminButton
                                  variant="secondary"
                                  onClick={() => {
                                    setSelected(item)
                                    setStatus(item.status)
                                    setCloseAfterHire(false)
                                  }}
                                >
                                  Update
                                </AdminButton>
                              </div>
                            </TableCell>
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

      <Modal
        open={selected !== null}
        title={selected ? selected.job.title : 'Update application'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e0d3c0] bg-[#fcfaf6] p-5">
              <p className="text-sm text-slate-500">
                Jobseeker:{' '}
                <span className="font-semibold text-slate-950">
                  {selected.jobseeker.full_name ?? selected.jobseeker.id}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Applied {formatDate(selected.applied_at)}
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                htmlFor="application-status"
              >
                Application status
              </label>
              <select
                className={inputClassName}
                id="application-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="hired">Hired</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[#e0d3c0] bg-[#fcfaf6] px-4 py-4 text-sm text-slate-700">
              <input
                checked={closeAfterHire}
                type="checkbox"
                onChange={(event) => setCloseAfterHire(event.target.checked)}
              />
              <span>Close the listing after marking this application hired</span>
            </label>

            <div className="flex flex-wrap gap-3">
              <AdminButton
                disabled={isSaving}
                onClick={() =>
                  void handleSave(selected, status, closeAfterHire)
                }
              >
                {isSaving ? 'Saving...' : 'Save application'}
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setSelected(null)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminWorkspaceLayout>
  )
}
