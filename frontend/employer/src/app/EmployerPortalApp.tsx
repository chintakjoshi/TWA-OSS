import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import { RequireRole } from '@shared/auth/RouteGuards'

import { employerAuthClient } from './authClient'
import { EmployerAuthPage } from '../pages/AuthPage'
import { EmployerDashboardPage } from '../pages/DashboardPage'
import { EmployerLandingPage } from '../pages/LandingPage'
import { EmployerListingDetailPage } from '../pages/ListingDetailPage'
import { EmployerListingsPage } from '../pages/ListingsPage'
import { EmployerNewListingPage } from '../pages/NewListingPage'
import { EmployerProfilePage } from '../pages/ProfilePage'

function EmployerRoutes() {
  const auth = useAuth()
  const authenticatedEmployer = auth.authMe?.app_user?.app_role === 'employer'

  return (
    <Routes>
      <Route path="/" element={<EmployerLandingPage />} />
      <Route path="/auth" element={authenticatedEmployer ? <Navigate replace to="/dashboard" /> : <EmployerAuthPage />} />
      <Route path="/dashboard" element={<RequireRole role="employer"><EmployerDashboardPage /></RequireRole>} />
      <Route path="/profile" element={<RequireRole role="employer"><EmployerProfilePage /></RequireRole>} />
      <Route path="/listings" element={<RequireRole role="employer"><EmployerListingsPage /></RequireRole>} />
      <Route path="/listings/new" element={<RequireRole role="employer"><EmployerNewListingPage /></RequireRole>} />
      <Route path="/listings/:listingId" element={<RequireRole role="employer"><EmployerListingDetailPage /></RequireRole>} />
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
