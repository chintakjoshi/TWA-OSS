import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CheckCheck,
  ClipboardList,
  FileClock,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '@shared/auth/AuthProvider'

import { listApplications, listAuditLog, listListings } from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import { useAdminShell } from '../components/layout/AdminShellProvider'
import {
  AdminButton,
  AdminPanel,
  PanelBody,
  PanelHeader,
  StatCard,
  StatusBadge,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { announceComingSoon } from '../lib/comingSoon'
import {
  describeAuditAction,
  formatDateTime,
  formatMonthLabel,
  formatRelativeTime,
} from '../lib/formatting'
import { loadAllPages } from '../lib/pagination'
import type {
  AdminApplication,
  AuditLogEntry,
  JobListing,
} from '../types/admin'

type PlacementRow = {
  month: string
  applications: number
  hires: number
}

function buildPlacementSummary(
  applications: AdminApplication[],
  listings: JobListing[]
): {
  rows: PlacementRow[]
  ytdApplications: number
  ytdHires: number
  ytdEmployers: number
} {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]))
  const monthMap = new Map<string, PlacementRow>()
  const currentYear = new Date().getFullYear()
  const hiredEmployerIds = new Set<string>()
  let ytdApplications = 0
  let ytdHires = 0

  applications.forEach((application) => {
    const appliedDate = new Date(application.applied_at)
    const bucket = new Date(
      appliedDate.getFullYear(),
      appliedDate.getMonth(),
      1
    )
    const key = bucket.toISOString()
    const existing = monthMap.get(key) ?? {
      month: key,
      applications: 0,
      hires: 0,
    }

    existing.applications += 1
    if (application.status === 'hired') {
      existing.hires += 1
      const listing = listingMap.get(application.job.id)
      if (listing?.employer_id) hiredEmployerIds.add(listing.employer_id)
    }
    monthMap.set(key, existing)

    if (appliedDate.getFullYear() === currentYear) {
      ytdApplications += 1
      if (application.status === 'hired') ytdHires += 1
    }
  })

  const rows = [...monthMap.values()]
    .sort((left, right) => right.month.localeCompare(left.month))
    .slice(0, 4)

  return {
    rows,
    ytdApplications,
    ytdHires,
    ytdEmployers: hiredEmployerIds.size,
  }
}

function describeActivity(entry: AuditLogEntry) {
  const action = describeAuditAction(entry.action)
  if (entry.entity_type === 'system') {
    return {
      title: action,
      detail: 'Background system event',
    }
  }

  const entityType = entry.entity_type.replaceAll('_', ' ')
  const entityId = entry.entity_id ? entry.entity_id.slice(0, 8) : 'record'
  return {
    title: action,
    detail: `${entityType} · ${entityId}`,
  }
}

export function AdminDashboardPage() {
  const auth = useAuth()
  const { summary, summaryLoading, refreshSummary } = useAdminShell()
  const [activity, setActivity] = useState<AuditLogEntry[]>([])
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [listings, setListings] = useState<JobListing[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(null)

    void Promise.all([
      refreshSummary(),
      listAuditLog(auth.requestTwa, { page: 1, pageSize: 5 }),
      loadAllPages((page) =>
        listApplications(auth.requestTwa, { page, pageSize: 50 })
      ),
      loadAllPages((page) =>
        listListings(auth.requestTwa, { page, pageSize: 50 })
      ),
    ])
      .then(([, auditResponse, applicationItems, listingItems]) => {
        if (!active) return
        setActivity(auditResponse.items)
        setApplications(applicationItems)
        setListings(listingItems)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa, refreshSummary])

  const placementSummary = useMemo(
    () => buildPlacementSummary(applications, listings),
    [applications, listings]
  )

  if (summaryLoading && !summary) {
    return (
      <AdminWorkspaceLayout
        title="Dashboard"
        primaryActionLabel="+ Add Jobseeker"
        onPrimaryAction={() => announceComingSoon('Add Jobseeker')}
      >
        <LoadingState title="Loading dashboard..." />
      </AdminWorkspaceLayout>
    )
  }

  if (!summary && error) {
    return (
      <AdminWorkspaceLayout
        title="Dashboard"
        primaryActionLabel="+ Add Jobseeker"
        onPrimaryAction={() => announceComingSoon('Add Jobseeker')}
      >
        <ErrorState title="Dashboard unavailable" message={error} />
      </AdminWorkspaceLayout>
    )
  }

  return (
    <AdminWorkspaceLayout
      title="Dashboard"
      primaryActionLabel="Add Jobseeker"
      onPrimaryAction={() => announceComingSoon('Add Jobseeker')}
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[#f0d8b0] bg-[#fffaf0] px-5 py-4 text-sm text-[#996100]">
            Some dashboard details are unavailable right now. Core counts are
            still visible.
          </div>
        ) : null}

        {summary ? (
          <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
            <StatCard
              accent="#d0922c"
              hint="Accounts waiting for review."
              icon={FileClock}
              label="Pending Employer Approvals"
              value={summary.pending_employers}
            />
            <StatCard
              accent="#d23b32"
              hint="Listings still awaiting staff decisions."
              icon={ClipboardList}
              label="Pending Listing Reviews"
              value={summary.pending_listings}
            />
            <StatCard
              accent="#3a9b67"
              hint="Active profiles in the current TWA system."
              icon={Users}
              label="Active Jobseekers"
              value={summary.active_jobseekers}
            />
            <StatCard
              accent="#2d62c6"
              hint="Applications not yet resolved into hires."
              icon={CheckCheck}
              label="Open Applications"
              value={summary.open_applications}
            />
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <AdminPanel>
            <PanelHeader
              action={
                <AdminButton
                  variant="secondary"
                  onClick={() => announceComingSoon('Activity export')}
                >
                  View All
                </AdminButton>
              }
              title="Recent Activity"
            />
            <PanelBody className="p-0">
              {activity.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    title="No recent activity"
                    message="Staff actions and system events will appear here as work happens."
                  />
                </div>
              ) : (
                <ul>
                  {activity.map((entry) => {
                    const item = describeActivity(entry)
                    return (
                      <li
                        key={entry.id}
                        className="flex items-start gap-4 border-b border-[#eadfce] px-6 py-5 last:border-b-0"
                      >
                        <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-full bg-[#eef5ff] text-[#295db8]">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-slate-950">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.detail}
                          </p>
                          <p className="mt-2 text-sm text-[#89a0c4]">
                            {formatRelativeTime(entry.timestamp)} ·{' '}
                            {formatDateTime(entry.timestamp)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </PanelBody>
          </AdminPanel>

          <AdminPanel>
            <PanelHeader
              subtitle="Built from current application and listing data."
              title="Placement Summary"
            />
            <PanelBody className="space-y-6">
              {placementSummary.rows.length === 0 ? (
                <EmptyState
                  title="No placement history yet"
                  message="This summary will fill in as applications and hires are recorded."
                />
              ) : (
                <>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...placementSummary.rows].reverse()}>
                        <CartesianGrid
                          stroke="#ede4d5"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          axisLine={false}
                          dataKey="month"
                          tick={{ fill: '#88a0c5', fontSize: 12 }}
                          tickFormatter={(value) => formatMonthLabel(value)}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tick={{ fill: '#88a0c5', fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid #ddcfba',
                            background: '#fffdf9',
                          }}
                          formatter={(value, name) => [
                            Number(value ?? 0),
                            name === 'applications' ? 'Applications' : 'Hires',
                          ]}
                          labelFormatter={(label) =>
                            formatMonthLabel(String(label))
                          }
                        />
                        <Bar
                          dataKey="applications"
                          fill="#d0922c"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="hires"
                          fill="#2f7d4b"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6]">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 border-b border-[#eadfce] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#89a0c4]">
                      <span>Month</span>
                      <span>Applications</span>
                      <span>Hires</span>
                    </div>
                    <div>
                      {placementSummary.rows.map((row) => (
                        <div
                          key={row.month}
                          className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 border-b border-[#eadfce] px-4 py-4 text-sm text-slate-700 last:border-b-0"
                        >
                          <span>{formatMonthLabel(row.month)}</span>
                          <span>{row.applications}</span>
                          <span>{row.hires}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#ead3b2] bg-[#fff6e8] px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d0922c]">
                      Year To Date
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="admin-display text-4xl font-semibold text-slate-950">
                        {placementSummary.ytdHires} placements
                      </p>
                      <StatusBadge tone="warning">
                        {placementSummary.ytdApplications} total applications
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Across {placementSummary.ytdEmployers} employers
                      represented in hired applications this year.
                    </p>
                  </div>
                </>
              )}
            </PanelBody>
          </AdminPanel>
        </div>
      </div>
    </AdminWorkspaceLayout>
  )
}
