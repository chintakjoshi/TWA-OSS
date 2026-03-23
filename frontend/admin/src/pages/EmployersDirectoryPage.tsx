import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { listEmployers, reviewEmployer } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import { useAdminShell } from '../components/layout/AdminShellProvider'
import {
  AdminButton,
  AdminPanel,
  DefinitionList,
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
import { announceComingSoon } from '../lib/comingSoon'
import { formatDate, formatDateTime, reviewTone } from '../lib/formatting'
import type { EmployerProfile } from '../types/admin'

export function AdminEmployersDirectoryPage() {
  const auth = useAuth()
  const { refreshSummary } = useAdminShell()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<EmployerProfile[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EmployerProfile | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'approved' | 'rejected'>(
    'approved'
  )
  const [reviewNote, setReviewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listEmployers(auth.requestTwa, {
        page,
        pageSize: 12,
        reviewStatus: statusFilter,
      })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load employers.'
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
    return items.filter((employer) =>
      [employer.org_name, employer.contact_name, employer.city]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    )
  }, [items, search])

  async function submitReview(
    employer: EmployerProfile,
    nextStatus: 'approved' | 'rejected' | 'pending',
    note: string
  ) {
    setIsSaving(true)
    try {
      await reviewEmployer(auth.requestTwa, employer.id, {
        review_status: nextStatus,
        review_note: note,
      })
      toast.success(`Saved ${employer.org_name}.`)
      setSelected(null)
      await Promise.all([loadData(), refreshSummary()])
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save employer review.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout
      title="All Employers"
      primaryActionLabel="Add Employer"
      onPrimaryAction={() => announceComingSoon('Add Employer')}
    >
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading employers..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Employers unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <div className="grid gap-3 md:grid-cols-[220px_180px]">
                  <input
                    className={inputClassName}
                    placeholder="Search employers..."
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
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              }
              title="All Employers"
            />
            <PanelBody className="p-0">
              {visibleItems.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No employers found"
                    message="Try broadening the current filters."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Organization</TableCell>
                          <TableCell header>City</TableCell>
                          <TableCell header>Contact</TableCell>
                          <TableCell header>Status</TableCell>
                          <TableCell header>Joined</TableCell>
                          <TableCell header>Actions</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {visibleItems.map((employer) => (
                          <tr key={employer.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {employer.org_name}
                            </TableCell>
                            <TableCell>{employer.city ?? 'Unknown'}</TableCell>
                            <TableCell>
                              {employer.contact_name ?? 'No contact'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge tone={reviewTone(employer.review_status)}>
                                {employer.review_status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>{formatDate(employer.created_at)}</TableCell>
                            <TableCell>
                              <AdminButton
                                variant="secondary"
                                onClick={() => {
                                  setSelected(employer)
                                  setReviewStatus(employer.review_status)
                                  setReviewNote(employer.review_note ?? '')
                                }}
                              >
                                Review
                              </AdminButton>
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
        title={selected ? selected.org_name : 'Employer review'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6">
            <DefinitionList
              items={[
                { label: 'Organization', value: selected.org_name },
                {
                  label: 'Contact',
                  value: selected.contact_name ?? 'No contact provided',
                },
                { label: 'Phone', value: selected.phone ?? 'No phone provided' },
                {
                  label: 'Address',
                  value:
                    [selected.address, selected.city, selected.zip]
                      .filter(Boolean)
                      .join(', ') || 'No address provided',
                },
                {
                  label: 'Created',
                  value: formatDateTime(selected.created_at),
                },
                {
                  label: 'Review note',
                  value: selected.review_note ?? 'No note on file',
                },
              ]}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                  htmlFor="directory-review-status"
                >
                  Review status
                </label>
                <select
                  className={inputClassName}
                  id="directory-review-status"
                  value={reviewStatus}
                  onChange={(event) =>
                    setReviewStatus(
                      event.target.value as typeof reviewStatus
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex items-end">
                <StatusBadge tone={reviewTone(reviewStatus)}>
                  {reviewStatus}
                </StatusBadge>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                htmlFor="directory-review-note"
              >
                Staff note
              </label>
              <textarea
                className={`${inputClassName} min-h-36 py-3`}
                id="directory-review-note"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton
                disabled={isSaving}
                onClick={() =>
                  void submitReview(selected, reviewStatus, reviewNote)
                }
              >
                {isSaving ? 'Saving...' : 'Save review'}
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
