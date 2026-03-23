import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import {
  getJobseekerDetail,
  listJobseekers,
  updateJobseeker,
} from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
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
import {
  formatChargeFlags,
  formatDateTime,
  formatStatusLabel,
} from '../lib/formatting'
import type {
  ChargeFlags,
  JobseekerDetail,
  JobseekerListItem,
  JobseekerUpdateInput,
} from '../types/admin'

const defaultCharges: ChargeFlags = {
  sex_offense: false,
  violent: false,
  armed: false,
  children: false,
  drug: false,
  theft: false,
}

const chargeOptions: Array<{ key: keyof ChargeFlags | ''; label: string }> = [
  { key: '', label: 'All Charge Types' },
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed offense' },
  { key: 'children', label: 'Children-related offense' },
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
]

function toValues(detail: JobseekerDetail | null): JobseekerUpdateInput {
  return {
    full_name: detail?.full_name ?? '',
    phone: detail?.phone ?? '',
    address: detail?.address ?? '',
    city: detail?.city ?? '',
    zip: detail?.zip ?? '',
    transit_type: detail?.transit_type ?? '',
    status: detail?.status ?? 'active',
    charges: detail?.charges ?? defaultCharges,
  }
}

export function AdminJobseekersPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [transitFilter, setTransitFilter] = useState('')
  const [chargeFilter, setChargeFilter] = useState<keyof ChargeFlags | ''>('')
  const [items, setItems] = useState<JobseekerListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<JobseekerDetail | null>(null)
  const [applications, setApplications] = useState<
    Array<{ id: string; status: string; job_listing_id: string }>
  >([])
  const [values, setValues] = useState<JobseekerUpdateInput>(() => toValues(null))
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listJobseekers(auth.requestTwa, {
        page,
        pageSize: 12,
        search,
        status: statusFilter,
        transitType: transitFilter,
        chargeKey: chargeFilter,
      })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load jobseekers.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, chargeFilter, page, search, statusFilter, transitFilter])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setIsDetailLoading(true)
    void getJobseekerDetail(auth.requestTwa, selectedId)
      .then((response) => {
        if (!active) return
        setDetail(response.jobseeker)
        setApplications(response.applications)
        setValues(toValues(response.jobseeker))
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa, selectedId])

  const visibleItems = useMemo(() => items, [items])

  async function handleSave() {
    if (!selectedId) return
    setIsSaving(true)
    try {
      await updateJobseeker(auth.requestTwa, selectedId, values)
      const response = await getJobseekerDetail(auth.requestTwa, selectedId)
      setDetail(response.jobseeker)
      setApplications(response.applications)
      setValues(toValues(response.jobseeker))
      toast.success('Jobseeker profile updated.')
      await loadList()
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update the selected jobseeker.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout
      title="Jobseekers"
      primaryActionLabel="Add Jobseeker"
      onPrimaryAction={() => announceComingSoon('Add Jobseeker')}
    >
      <div className="space-y-6">
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        {isLoading ? <LoadingState title="Loading jobseekers..." /> : null}
        {!isLoading && error && items.length === 0 ? (
          <ErrorState title="Jobseekers unavailable" message={error} />
        ) : null}

        {!isLoading ? (
          <AdminPanel>
            <PanelHeader
              action={
                <div className="grid gap-3 xl:grid-cols-[180px_170px_170px_200px]">
                  <input
                    className={inputClassName}
                    placeholder="Search by name..."
                    value={search}
                    onChange={(event) => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
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
                    <option value="active">Active</option>
                    <option value="hired">Hired</option>
                  </select>
                  <select
                    className={inputClassName}
                    value={transitFilter}
                    onChange={(event) => {
                      setPage(1)
                      setTransitFilter(event.target.value)
                    }}
                  >
                    <option value="">All Transit Types</option>
                    <option value="public_transit">Public transit</option>
                    <option value="own_car">Own car</option>
                    <option value="both">Both</option>
                  </select>
                  <select
                    className={inputClassName}
                    value={chargeFilter}
                    onChange={(event) => {
                      setPage(1)
                      setChargeFilter(
                        event.target.value as keyof ChargeFlags | ''
                      )
                    }}
                  >
                    {chargeOptions.map((option) => (
                      <option key={option.key || 'all'} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
              title="All Jobseekers"
            />
            <PanelBody className="p-0">
              {visibleItems.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No jobseekers found"
                    message="Try broadening the current filters."
                  />
                </div>
              ) : (
                <>
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <TableHeadRow>
                          <TableCell header>Name</TableCell>
                          <TableCell header>Location</TableCell>
                          <TableCell header>Transit</TableCell>
                          <TableCell header>Disclosed Charges</TableCell>
                          <TableCell header>Status</TableCell>
                          <TableCell header>Actions</TableCell>
                        </TableHeadRow>
                      </thead>
                      <tbody>
                        {visibleItems.map((item) => (
                          <tr key={item.id}>
                            <TableCell className="font-semibold text-slate-950">
                              {item.full_name ?? 'Name missing'}
                            </TableCell>
                            <TableCell>{item.city ?? 'Unknown'}</TableCell>
                            <TableCell>
                              {item.transit_type
                                ? formatStatusLabel(item.transit_type)
                                : 'Not set'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge tone="info">
                                Open profile for details
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                tone={item.status === 'hired' ? 'success' : 'active'}
                              >
                                {item.status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <AdminButton
                                variant="secondary"
                                onClick={() => setSelectedId(item.id)}
                              >
                                Profile
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
        open={selectedId !== null}
        title={detail?.full_name ?? 'Jobseeker profile'}
        onClose={() => setSelectedId(null)}
      >
        {isDetailLoading ? (
          <LoadingState title="Loading selected jobseeker..." />
        ) : null}
        {!isDetailLoading && detail ? (
          <div className="space-y-6">
            <DefinitionList
              items={[
                {
                  label: 'Profile complete',
                  value: detail.profile_complete ? 'Yes' : 'No',
                },
                {
                  label: 'Current charges',
                  value: formatChargeFlags(detail.charges).join(', ') || 'None',
                },
                {
                  label: 'Last updated',
                  value: formatDateTime(detail.updated_at),
                },
                {
                  label: 'Created',
                  value: formatDateTime(detail.created_at),
                },
              ]}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Full name
                </label>
                <input
                  className={inputClassName}
                  value={values.full_name}
                  onChange={(event) =>
                    setValues({ ...values, full_name: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Phone
                </label>
                <input
                  className={inputClassName}
                  value={values.phone}
                  onChange={(event) =>
                    setValues({ ...values, phone: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Address
                </label>
                <input
                  className={inputClassName}
                  value={values.address}
                  onChange={(event) =>
                    setValues({ ...values, address: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  City
                </label>
                <input
                  className={inputClassName}
                  value={values.city}
                  onChange={(event) =>
                    setValues({ ...values, city: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  ZIP
                </label>
                <input
                  className={inputClassName}
                  value={values.zip}
                  onChange={(event) =>
                    setValues({ ...values, zip: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Transit type
                </label>
                <select
                  className={inputClassName}
                  value={values.transit_type}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      transit_type: event.target
                        .value as JobseekerUpdateInput['transit_type'],
                    })
                  }
                >
                  <option value="">Not set</option>
                  <option value="public_transit">Public transit</option>
                  <option value="own_car">Own car</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Placement status
                </label>
                <select
                  className={inputClassName}
                  value={values.status}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      status: event.target.value as JobseekerUpdateInput['status'],
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                Charge Categories
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {chargeOptions.slice(1).map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 rounded-2xl border border-[#e0d3c0] bg-[#fcfaf6] px-4 py-4 text-sm text-slate-700"
                  >
                    <input
                      checked={values.charges[option.key as keyof ChargeFlags]}
                      type="checkbox"
                      onChange={(event) =>
                        setValues({
                          ...values,
                          charges: {
                            ...values.charges,
                            [option.key]: event.target.checked,
                          },
                        })
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                Applications
              </p>
              {applications.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No applications recorded yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-3 rounded-2xl border border-[#e0d3c0] bg-[#fcfaf6] p-4">
                  {applications.map((application) => (
                    <li
                      key={application.id}
                      className="flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium text-slate-950">
                        Listing {application.job_listing_id.slice(0, 8)}
                      </span>
                      <StatusBadge
                        tone={
                          application.status === 'hired'
                            ? 'success'
                            : application.status === 'reviewed'
                              ? 'active'
                              : 'info'
                        }
                      >
                        {application.status}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'Saving...' : 'Save profile'}
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setSelectedId(null)}>
                Close
              </AdminButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminWorkspaceLayout>
  )
}
