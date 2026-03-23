import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { listEmployerQueue, reviewEmployer } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import { useAdminShell } from '../components/layout/AdminShellProvider'
import {
  AdminButton,
  AdminPanel,
  DefinitionList,
  Modal,
  PanelBody,
  PanelHeader,
  StatusBadge,
  TableCell,
  TableHeadRow,
  TableWrap,
  DataTable,
  inputClassName,
  InlineNotice,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { announceComingSoon } from '../lib/comingSoon'
import { formatDate, formatDateTime, reviewTone } from '../lib/formatting'
import type { EmployerProfile } from '../types/admin'

export function AdminEmployersPage() {
  const auth = useAuth()
  const { refreshSummary, summary } = useAdminShell()
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<EmployerProfile[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EmployerProfile | null>(null)
  const [reviewStatus, setReviewStatus] = useState<
    'pending' | 'approved' | 'rejected'
  >('approved')
  const [reviewNote, setReviewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listEmployerQueue(auth.requestTwa, page)
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load pending employers.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, page])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

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
      toast.success(
        nextStatus === 'approved'
          ? `${employer.org_name} approved.`
          : nextStatus === 'rejected'
            ? `${employer.org_name} rejected.`
            : `${employer.org_name} returned to pending.`
      )
      setSelected(null)
      await Promise.all([loadQueue(), refreshSummary()])
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
      title="Employer Approval Queue"
      primaryActionLabel="Add Employer"
      onPrimaryAction={() => announceComingSoon('Add Employer')}
    >
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading employer queue..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Employer queue unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <StatusBadge tone="warning">
                  {summary?.pending_employers ?? items.length} Pending
                </StatusBadge>
              }
              title="Pending Employer Registrations"
            />
            <PanelBody className="p-0">
              {items.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No pending employers"
                    message="The approval queue is clear right now."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Organization</TableCell>
                          <TableCell header>Contact</TableCell>
                          <TableCell header>Phone</TableCell>
                          <TableCell header>Submitted</TableCell>
                          <TableCell header>Status</TableCell>
                          <TableCell header>Actions</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {items.map((employer) => (
                          <tr key={employer.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {employer.org_name}
                            </TableCell>
                            <TableCell>
                              {employer.contact_name ?? 'No contact'}
                            </TableCell>
                            <TableCell>
                              {employer.phone ?? 'No phone'}
                            </TableCell>
                            <TableCell>
                              {formatDate(employer.created_at)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={reviewTone(employer.review_status)}
                              >
                                {employer.review_status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <AdminButton
                                  variant="success"
                                  onClick={() =>
                                    void submitReview(employer, 'approved', '')
                                  }
                                >
                                  Approve
                                </AdminButton>
                                <AdminButton
                                  variant="danger"
                                  onClick={() =>
                                    void submitReview(employer, 'rejected', '')
                                  }
                                >
                                  Reject
                                </AdminButton>
                                <AdminButton
                                  variant="secondary"
                                  onClick={() => {
                                    setSelected(employer)
                                    setReviewStatus(employer.review_status)
                                    setReviewNote(employer.review_note ?? '')
                                  }}
                                >
                                  Open review
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
        title={selected ? `Review ${selected.org_name}` : 'Review employer'}
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
                {
                  label: 'Phone',
                  value: selected.phone ?? 'No phone provided',
                },
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
                  label: 'Last reviewed',
                  value: formatDateTime(selected.reviewed_at),
                },
              ]}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]"
                  htmlFor="review-status"
                >
                  Review status
                </label>
                <select
                  className={inputClassName}
                  id="review-status"
                  value={reviewStatus}
                  onChange={(event) =>
                    setReviewStatus(event.target.value as typeof reviewStatus)
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
                htmlFor="review-note"
              >
                Staff note
              </label>
              <textarea
                className={`${inputClassName} min-h-36 py-3`}
                id="review-note"
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
              <AdminButton
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminWorkspaceLayout>
  )
}
