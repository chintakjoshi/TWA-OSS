import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import { RequireRole } from '@shared/auth/RouteGuards'

import { employerAuthClient } from './authClient'
import { EmployerApplicantsPage } from '../pages/ApplicantsPage'
import { EmployerAuthPage } from '../pages/AuthPage'
import { EmployerDashboardPage } from '../pages/DashboardPage'
import { EmployerListingDetailPage } from '../pages/ListingDetailPage'
import { EmployerListingsPage } from '../pages/ListingsPage'
import { EmployerNewListingPage } from '../pages/NewListingPage'
import { EmployerProfilePage } from '../pages/ProfilePage'
import { EmployerSetupPage } from '../pages/SetupPage'

function EmployerHomeRoute() {
  const auth = useAuth()
  if (auth.state === 'loading') return null
  if (auth.authMe?.app_user?.app_role === 'employer') {
    return <Navigate replace to="/dashboard" />
  }
  if (auth.state === 'authenticated') {
    return <Navigate replace to="/setup" />
  }
  return <Navigate replace to="/auth" />
}

function RequireAuthenticatedWithoutRole({
  children,
}: {
  children: ReactNode
}) {
  const auth = useAuth()
  if (auth.state === 'loading') return null
  if (auth.state === 'anonymous') return <Navigate replace to="/auth" />
  if (auth.authMe?.app_user) return <Navigate replace to="/dashboard" />
  return <>{children}</>
}

function EmployerRoutes() {
  const auth = useAuth()
  const authenticatedEmployer = auth.authMe?.app_user?.app_role === 'employer'

  return (
    <Routes>
      <Route path="/" element={<EmployerHomeRoute />} />
      <Route
        path="/auth"
        element={
          authenticatedEmployer ? (
            <Navigate replace to="/dashboard" />
          ) : auth.state === 'authenticated' && !auth.authMe?.app_user ? (
            <Navigate replace to="/setup" />
          ) : (
            <EmployerAuthPage />
          )
        }
      />
      <Route
        path="/setup"
        element={
          <RequireAuthenticatedWithoutRole>
            <EmployerSetupPage />
          </RequireAuthenticatedWithoutRole>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireRole role="employer">
            <EmployerDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireRole role="employer">
            <EmployerProfilePage />
          </RequireRole>
        }
      />
      <Route
        path="/my-listings"
        element={
          <RequireRole role="employer">
            <EmployerListingsPage />
          </RequireRole>
        }
      />
      <Route
        path="/submit-listing"
        element={
          <RequireRole role="employer">
            <EmployerNewListingPage />
          </RequireRole>
        }
      />
      <Route
        path="/my-listings/:listingId"
        element={
          <RequireRole role="employer">
            <EmployerListingDetailPage />
          </RequireRole>
        }
      />
      <Route
        path="/applicants"
        element={
          <RequireRole role="employer">
            <EmployerApplicantsPage />
          </RequireRole>
        }
      />
      <Route
        path="/listings/new"
        element={<Navigate replace to="/submit-listing" />}
      />
      <Route
        path="/listings"
        element={<Navigate replace to="/my-listings" />}
      />
      <Route
        path="/listings/:listingId"
        element={
          <RequireRole role="employer">
            <EmployerListingDetailPage />
          </RequireRole>
        }
      />
      <Route
        path="/listings/:listingId/applicants"
        element={
          <RequireRole role="employer">
            <EmployerApplicantsPage />
          </RequireRole>
        }
      />
      <Route path="/workspace" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function EmployerPortalApp() {
  return (
    <AuthProvider client={employerAuthClient}>
      <EmployerRoutes />
    </AuthProvider>
  )
}
