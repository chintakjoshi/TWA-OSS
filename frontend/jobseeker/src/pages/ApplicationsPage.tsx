import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, Eye, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { listMyApplications } from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  PanelBody,
  PortalBadge,
  PortalButton,
  PortalPanel,
  StatCard,
  inputClassName,
} from '../components/ui/JobseekerUi'
import { formatDate } from '../lib/formatting'
import type { ApplicationListItem } from '../types/jobseeker'

function statusTone(status: ApplicationListItem['status']) {
  if (status === 'hired') return 'success'
  if (status === 'reviewed') return 'info'
  return 'warning'
}

function statusLabel(status: ApplicationListItem['status']) {
  if (status === 'hired') return 'Hired'
  if (status === 'reviewed') return 'Reviewed'
  return 'Submitted'
}

export function JobseekerApplicationsPage() {
  const auth = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<ApplicationListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
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
        setTotalItems(response.meta.total_items)
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

  const stats = useMemo(
    () => ({
      submitted: items.filter((item) => item.status === 'submitted').length,
      reviewed: items.filter((item) => item.status === 'reviewed').length,
      hired: items.filter((item) => item.status === 'hired').length,
    }),
    [items]
  )

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <JobseekerHeader />

      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 pb-12 sm:px-6">
        <div className="space-y-8">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <PortalPanel className="bg-[#132130] text-white">
              <PanelBody className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#91a8ca]">
                  My Applications
                </p>
                <h1 className="jobseeker-display text-[3rem] leading-[0.98] font-semibold">
                  Track every listing you have applied to.
                </h1>
                <p className="max-w-[620px] text-lg leading-8 text-[#cfdbeb]">
                  This view reflects the real TWA workflow status values:
                  submitted, reviewed, and hired.
                </p>
              </PanelBody>
            </PortalPanel>

            <PortalPanel>
              <PanelBody className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Filter by status
                </label>
                <select
                  className={inputClassName}
                  value={status}
                  onChange={(event) => {
                    setPage(1)
                    setStatus(event.target.value)
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="hired">Hired</option>
                </select>
                <PortalBadge tone="info">
                  {totalItems} applications found
                </PortalBadge>
              </PanelBody>
            </PortalPanel>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              accent="#d0922c"
              hint="Applications in this result set"
              icon={ClipboardList}
              label="Visible Applications"
              value={String(totalItems)}
            />
            <StatCard
              accent="#3569c7"
              hint="Applications currently reviewed"
              icon={Eye}
              label="Reviewed"
              value={String(stats.reviewed)}
            />
            <StatCard
              accent="#2f7d4b"
              hint="Applications marked hired"
              icon={Trophy}
              label="Hired"
              value={String(stats.hired)}
            />
          </section>

          {isLoading ? <LoadingState title="Loading applications..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Applications unavailable" message={error} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState
              title="No applications yet"
              message="Once you apply to a listing, it will appear here with its current TWA status."
            />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <PortalPanel key={item.id}>
                  <PanelBody className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e6dac7] bg-[#f9f4eb] text-lg font-semibold text-[#132130]">
                        {item.job.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">
                            {item.job.title}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {item.job.city ?? 'Location pending'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-[#d0922c]" />
                            Applied {formatDate(item.applied_at)}
                          </span>
                          <span className="rounded-full bg-[#f6f2ea] px-3 py-1.5 text-slate-600">
                            Listing is {item.job.lifecycle_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <PortalBadge tone={statusTone(item.status)}>
                        {statusLabel(item.status)}
                      </PortalBadge>
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#ddd1be] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                        to={`/jobs/${item.job.id}`}
                      >
                        View job
                      </Link>
                    </div>
                  </PanelBody>
                </PortalPanel>
              ))}
            </div>
          ) : null}

          {!isLoading && !error && totalPages > 1 ? (
            <PortalPanel>
              <PanelBody className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex flex-wrap gap-3">
                  <PortalButton
                    disabled={page <= 1}
                    variant="secondary"
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </PortalButton>
                  <PortalButton
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </PortalButton>
                </div>
              </PanelBody>
            </PortalPanel>
          ) : null}
        </div>
      </main>
    </div>
  )
}
