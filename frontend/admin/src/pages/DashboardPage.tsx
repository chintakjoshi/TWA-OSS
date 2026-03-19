import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Card, CardBody } from '@shared/ui/primitives'

import { getDashboard } from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import type { AdminDashboard } from '../types/admin'
import { useAuth } from '@shared/auth/AuthProvider'

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <Card>
      <CardBody className="stack-sm">
        <p className="eyebrow">{label}</p>
        <h3 className="dashboard-stat">{value}</h3>
        <p className="card-copy">{detail}</p>
      </CardBody>
    </Card>
  )
}

export function AdminDashboardPage() {
  const auth = useAuth()
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getDashboard(auth.requestTwa)
      .then((response) => {
        if (!active) return
        setDashboard(response)
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
  }, [auth])

  return (
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      {isLoading ? <LoadingState title="Loading staff dashboard..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Dashboard unavailable" message={error} />
      ) : null}
      {!isLoading && !error && dashboard ? (
        <>
          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="portal-eyebrow">Dashboard</p>
                <h2 className="card-title">
                  The queue pressure is visible at a glance.
                </h2>
                <p className="portal-copy">
                  Use this dashboard as the starting point for approvals,
                  matches, and application decisions.
                </p>
              </div>
              <Alert tone="info">
                <p>
                  Signed in as {auth.authMe?.app_user?.email}. Staff actions
                  here directly affect employer and jobseeker workflows across
                  TWA.
                </p>
              </Alert>
            </CardBody>
          </Card>

          <div className="dashboard-grid admin-metrics-grid">
            <MetricCard
              detail="Employers waiting for review."
              label="Pending employers"
              value={dashboard.pending_employers}
            />
            <MetricCard
              detail="Listings still awaiting a staff decision."
              label="Pending listings"
              value={dashboard.pending_listings}
            />
            <MetricCard
              detail="Active jobseekers currently in the system."
              label="Active jobseekers"
              value={dashboard.active_jobseekers}
            />
            <MetricCard
              detail="Applications not yet resolved into placements."
              label="Open applications"
              value={dashboard.open_applications}
            />
            <MetricCard
              detail="Approved listings still open to applicants."
              label="Open listings"
              value={dashboard.open_listings}
            />
          </div>

          <Card strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="portal-eyebrow">Quick Actions</p>
                <h2 className="card-title">
                  Jump directly into the operational areas.
                </h2>
              </div>
              <div className="inline-actions">
                <Link className="button button-primary" to="/employers">
                  Review employers
                </Link>
                <Link className="button button-secondary" to="/listings">
                  Review listings
                </Link>
                <Link className="button button-secondary" to="/jobseekers">
                  Manage jobseekers
                </Link>
                <Link className="button button-secondary" to="/matches">
                  Run matches
                </Link>
                <Link className="button button-secondary" to="/applications">
                  Track applications
                </Link>
                <Link className="button button-secondary" to="/audit">
                  Open audit log
                </Link>
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  )
}
