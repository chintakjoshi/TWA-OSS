import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import type { AuthClient } from '@shared/lib/auth-client'
import { RequireRole } from '@shared/auth/RouteGuards'
import { ErrorBoundary } from '@shared/routing/ErrorBoundary'
import { RouteSuspense } from '@shared/routing/LazyRoute'

import { employerAuthClient } from './authClient'
import {
  LazyEmployerApplicantsPage,
  LazyEmployerDashboardPage,
  LazyEmployerListingDetailPage,
  LazyEmployerListingsPage,
  LazyEmployerNewListingPage,
  LazyEmployerProfilePage,
  LazyEmployerSetupPage,
} from './routeModules'
import { EmployerAuthPage } from '../pages/AuthPage'

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
          <RouteSuspense>
            <RequireAuthenticatedWithoutRole>
              <LazyEmployerSetupPage />
            </RequireAuthenticatedWithoutRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerDashboardPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/profile"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerProfilePage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/my-listings"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerListingsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/submit-listing"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerNewListingPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/my-listings/:listingId"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerListingDetailPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/applicants"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerApplicantsPage />
            </RequireRole>
          </RouteSuspense>
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
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerListingDetailPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/listings/:listingId/applicants"
        element={
          <RouteSuspense>
            <RequireRole role="employer">
              <LazyEmployerApplicantsPage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route path="/workspace" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function EmployerPortalApp({
  client = employerAuthClient,
}: {
  client?: AuthClient
}) {
  return (
    <ErrorBoundary>
      <AuthProvider client={client}>
        <EmployerRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}
