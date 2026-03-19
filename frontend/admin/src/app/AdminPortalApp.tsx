import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import { RequireRole } from '@shared/auth/RouteGuards'

import { adminAuthClient } from './authClient'
import { AdminApplicationsPage } from '../pages/ApplicationsPage'
import { AdminAuditLogPage } from '../pages/AuditLogPage'
import { AdminAuthPage } from '../pages/AuthPage'
import { AdminDashboardPage } from '../pages/DashboardPage'
import { AdminEmployersPage } from '../pages/EmployersPage'
import { AdminJobseekersPage } from '../pages/JobseekersPage'
import { AdminLandingPage } from '../pages/LandingPage'
import { AdminListingsPage } from '../pages/ListingsPage'
import { AdminMatchesPage } from '../pages/MatchesPage'
import { AdminNotificationsPage } from '../pages/NotificationsPage'

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
          <RequireRole role="staff">
            <AdminDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/employers"
        element={
          <RequireRole role="staff">
            <AdminEmployersPage />
          </RequireRole>
        }
      />
      <Route
        path="/listings"
        element={
          <RequireRole role="staff">
            <AdminListingsPage />
          </RequireRole>
        }
      />
      <Route
        path="/jobseekers"
        element={
          <RequireRole role="staff">
            <AdminJobseekersPage />
          </RequireRole>
        }
      />
      <Route
        path="/matches"
        element={
          <RequireRole role="staff">
            <AdminMatchesPage />
          </RequireRole>
        }
      />
      <Route
        path="/applications"
        element={
          <RequireRole role="staff">
            <AdminApplicationsPage />
          </RequireRole>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireRole role="staff">
            <AdminNotificationsPage />
          </RequireRole>
        }
      />
      <Route
        path="/audit"
        element={
          <RequireRole role="staff">
            <AdminAuditLogPage />
          </RequireRole>
        }
      />
      <Route path="/workspace" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function AdminPortalApp() {
  return (
    <AuthProvider client={adminAuthClient}>
      <AdminRoutes />
    </AuthProvider>
  )
}
