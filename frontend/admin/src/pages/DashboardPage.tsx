import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

import { listAuditLog } from '../api/adminApi'
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
import type { AuditLogEntry, PlacementSummary } from '../types/admin'

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
  const authState = auth.state
  const authRole = auth.authMe?.app_user?.app_role
  const requestTwa = auth.requestTwa
  const navigate = useNavigate()
  const { summary, summaryLoading } = useAdminShell()
  const [activity, setActivity] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      setActivity([])
      setError(null)
      return
    }

    let active = true
    setError(null)

    void listAuditLog(requestTwa, { page: 1, pageSize: 5 })
      .then((auditResponse) => {
        if (!active) return
        setActivity(auditResponse.items)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })

    return () => {
      active = false
    }
  }, [authRole, authState, requestTwa])

  const placementSummary: PlacementSummary = summary?.placement_summary ?? {
    rows: [],
    ytd_applications: 0,
    ytd_hires: 0,
    ytd_employers: 0,
  }

  if (summaryLoading && !summary) {
    return (
      <AdminWorkspaceLayout
        title="TWA Dashboard"
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
        title="TWA Dashboard"
        primaryActionLabel="+ Add Jobseeker"
        onPrimaryAction={() => announceComingSoon('Add Jobseeker')}
      >
        <ErrorState title="Dashboard unavailable" message={error} />
      </AdminWorkspaceLayout>
    )
  }

  return (
    <AdminWorkspaceLayout
      title="TWA Dashboard"
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
              onClick={() => navigate('/employers/queue')}
              value={summary.pending_employers}
            />
            <StatCard
              accent="#d23b32"
              hint="Listings still awaiting staff decisions."
              icon={ClipboardList}
              label="Pending Listing Reviews"
              onClick={() => navigate('/listings/queue')}
              value={summary.pending_listings}
            />
            <StatCard
              accent="#3a9b67"
              hint="Active profiles in the current TWA system."
              icon={Users}
              label="Active Jobseekers"
              onClick={() => navigate('/jobseekers')}
              value={summary.active_jobseekers}
            />
            <StatCard
              accent="#2d62c6"
              hint="Applications not yet resolved into hires."
              icon={CheckCheck}
              label="Open Applications"
              onClick={() => navigate('/applications')}
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
                        {placementSummary.ytd_hires} placements
                      </p>
                      <StatusBadge tone="warning">
                        {placementSummary.ytd_applications} total applications
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Across {placementSummary.ytd_employers} employers
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
