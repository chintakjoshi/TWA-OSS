import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import type { AuthClient } from '@shared/lib/auth-client'
import { RequireRole } from '@shared/auth/RouteGuards'
import { RouteSuspense } from '@shared/routing/LazyRoute'

import { adminAuthClient } from './authClient'
import {
  LazyAdminApplicationsPage,
  LazyAdminAuditLogPage,
  LazyAdminDashboardPage,
  LazyAdminEmployersDirectoryPage,
  LazyAdminEmployersPage,
  LazyAdminJobseekersPage,
  LazyAdminListingMatchesPage,
  LazyAdminListingQueuePage,
  LazyAdminListingsPage,
  LazyAdminMatchesPage,
  LazyAdminNotificationsPage,
  LazyAdminSessionsPage,
  LazyAdminSecurityPage,
} from './routeModules'
import { AdminAuthPage } from '../pages/AuthPage'
import { AdminLandingPage } from '../pages/LandingPage'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'

function AdminRoutes() {
  const auth = useAuth()
  const authenticatedStaff = auth.authMe?.app_user?.app_role === 'staff'

  return (
    <Routes>
      <Route path="/" element={<AdminLandingPage />} />
      <Route
        path="/auth"
        element={
          authenticatedStaff ? (
            <Navigate replace to="/dashboard" />
          ) : (
            <AdminAuthPage />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminDashboardPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/employers/queue"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminEmployersPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/listings"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminListingsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/employers"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminEmployersDirectoryPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/listings/queue"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminListingQueuePage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/jobseekers"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminJobseekersPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/matches/jobseekers"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminMatchesPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/matches/listings"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminListingMatchesPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/applications"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminApplicationsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/sessions"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminSessionsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/security"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminSecurityPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/notifications"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminNotificationsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/audit"
        element={
          <RouteSuspense>
            <RequireRole role="staff">
              <LazyAdminAuditLogPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/matches"
        element={<Navigate replace to="/matches/jobseekers" />}
      />
      <Route path="/workspace" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function AdminPortalApp({
  client = adminAuthClient,
}: {
  client?: AuthClient
}) {
  return (
    <AuthProvider client={client}>
      <AdminShellProvider>
        <AdminRoutes />
      </AdminShellProvider>
    </AuthProvider>
  )
}
