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
} from '@shared/ui/primitives'

import {
  getJobseekerDetail,
  listJobseekers,
  updateJobseeker,
} from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
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

const chargeOptions: Array<{ key: keyof ChargeFlags; label: string }> = [
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
  const [items, setItems] = useState<JobseekerListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<JobseekerDetail | null>(null)
  const [applications, setApplications] = useState<
    Array<{ id: string; status: string; job_listing_id: string }>
  >([])
  const [values, setValues] = useState<JobseekerUpdateInput>(() =>
    toValues(null)
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listJobseekers(auth.requestTwa, {
        page,
        search,
        status: statusFilter,
        transitType: transitFilter,
      })
      setItems(response.items)
      setTotalPages(response.meta.total_pages)
      if (!selectedId && response.items[0]) setSelectedId(response.items[0].id)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load jobseekers.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [auth.requestTwa, page, search, statusFilter, transitFilter, selectedId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setIsDetailLoading(true)
    setError(null)
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
  }, [auth, selectedId])

  const rows = useMemo(
    () =>
      items.map((item) => [
        item.full_name ?? 'Name missing',
        item.city ?? 'Unknown',
        item.transit_type ? formatStatusLabel(item.transit_type) : 'Not set',
        <Badge
          key={`${item.id}-status`}
          tone={item.status === 'hired' ? 'success' : 'info'}
        >
          {item.status}
        </Badge>,
        <Button
          key={`${item.id}-open`}
          tone="secondary"
          onClick={() => setSelectedId(item.id)}
        >
          Open profile
        </Button>,
      ]),
    [items]
  )

  async function handleSave() {
    if (!selectedId) return
    setIsSaving(true)
    setSuccess(null)
    setError(null)
    try {
      await updateJobseeker(auth.requestTwa, selectedId, values)
      const response = await getJobseekerDetail(auth.requestTwa, selectedId)
      setDetail(response.jobseeker)
      setApplications(response.applications)
      setValues(toValues(response.jobseeker))
      setSuccess('Jobseeker profile updated.')
      await loadList()
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update the jobseeker profile.'
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
          <div className="stack-sm">
            <p className="portal-eyebrow">Jobseekers</p>
            <h2 className="card-title">
              Edit profiles and placement status without leaving the admin
              console.
            </h2>
            <p className="card-copy">
              This page combines the searchable list with a staff-editable
              profile panel.
            </p>
          </div>
          <div className="filter-grid">
            <Field label="Search">
              <input
                value={search}
                onChange={(event) => {
                  setPage(1)
                  setSearch(event.target.value)
                }}
                placeholder="Name or city"
              />
            </Field>
            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setPage(1)
                  setStatusFilter(event.target.value)
                }}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="hired">Hired</option>
              </select>
            </Field>
            <Field label="Transit">
              <select
                value={transitFilter}
                onChange={(event) => {
                  setPage(1)
                  setTransitFilter(event.target.value)
                }}
              >
                <option value="">All transit types</option>
                <option value="own_car">Own car</option>
                <option value="public_transit">Public transit</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>
          {success ? (
            <Alert tone="success">
              <p>{success}</p>
            </Alert>
          ) : null}
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      {isLoading ? <LoadingState title="Loading jobseekers..." /> : null}
      {!isLoading && error && items.length === 0 ? (
        <ErrorState title="Jobseekers unavailable" message={error} />
      ) : null}
      {!isLoading ? (
        <div className="admin-two-column-grid wide-sidebar-grid">
          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Search results</p>
                <h2 className="card-title">
                  Select a profile to inspect or edit.
                </h2>
              </div>
              {items.length === 0 ? (
                <EmptyState
                  title="No jobseekers found"
                  message="Try broadening the current filters."
                />
              ) : (
                <DataTable
                  columns={['Name', 'City', 'Transit', 'Status', 'Action']}
                  rows={rows}
                />
              )}
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

          <Card strong>
            <CardBody className="stack-md">
              {isDetailLoading ? (
                <LoadingState title="Loading selected jobseeker..." />
              ) : null}
              {!isDetailLoading && !detail ? (
                <EmptyState
                  title="No jobseeker selected"
                  message="Pick a row from the list to open its full profile."
                />
              ) : null}
              {!isDetailLoading && detail ? (
                <>
                  <div
                    className="cluster"
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="stack-sm">
                      <p className="eyebrow">Profile editor</p>
                      <h2 className="card-title">
                        {detail.full_name ?? 'Unnamed jobseeker'}
                      </h2>
                      <p className="card-copy">
                        Profile complete:{' '}
                        {detail.profile_complete ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <Badge
                      tone={detail.status === 'hired' ? 'success' : 'info'}
                    >
                      {detail.status}
                    </Badge>
                  </div>

                  <div className="detail-grid">
                    <Field label="Full name">
                      <input
                        value={values.full_name}
                        onChange={(event) =>
                          setValues({
                            ...values,
                            full_name: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        value={values.phone}
                        onChange={(event) =>
                          setValues({ ...values, phone: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Address">
                      <input
                        value={values.address}
                        onChange={(event) =>
                          setValues({ ...values, address: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="City">
                      <input
                        value={values.city}
                        onChange={(event) =>
                          setValues({ ...values, city: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="ZIP">
                      <input
                        value={values.zip}
                        onChange={(event) =>
                          setValues({ ...values, zip: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Transit type">
                      <select
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
                        <option value="own_car">Own car</option>
                        <option value="public_transit">Public transit</option>
                        <option value="both">Both</option>
                      </select>
                    </Field>
                    <Field label="Placement status">
                      <select
                        value={values.status}
                        onChange={(event) =>
                          setValues({
                            ...values,
                            status: event.target
                              .value as JobseekerUpdateInput['status'],
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="hired">Hired</option>
                      </select>
                    </Field>
                  </div>

                  <div className="stack-sm">
                    <p className="eyebrow">Charge categories</p>
                    <div className="charges-grid">
                      {chargeOptions.map((option) => (
                        <label className="charge-option" key={option.key}>
                          <input
                            checked={values.charges[option.key]}
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

                  <div className="stack-sm profile-meta-panel">
                    <p className="card-copy">
                      Current charges:{' '}
                      {formatChargeFlags(detail.charges).join(', ') || 'None'}
                    </p>
                    <p className="card-copy">
                      Last updated: {formatDateTime(detail.updated_at)}
                    </p>
                  </div>

                  <div className="inline-actions">
                    <Button
                      disabled={isSaving}
                      onClick={() => void handleSave()}
                    >
                      {isSaving ? 'Saving...' : 'Save jobseeker profile'}
                    </Button>
                  </div>

                  <div className="stack-sm">
                    <p className="eyebrow">Applications</p>
                    {applications.length === 0 ? (
                      <p className="card-copy">No applications recorded yet.</p>
                    ) : (
                      <ul className="summary-list">
                        {applications.map((application) => (
                          <li key={application.id}>
                            Application {application.id} - {application.status}{' '}
                            - listing {application.job_listing_id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
