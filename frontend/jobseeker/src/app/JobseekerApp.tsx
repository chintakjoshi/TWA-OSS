import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import type { AuthClient } from '@shared/lib/auth-client'
import { RequireRole } from '@shared/auth/RouteGuards'
import { RouteSuspense } from '@shared/routing/LazyRoute'

import { jobseekerAuthClient } from './authClient'
import {
  LazyJobseekerApplicationsPage,
  LazyJobseekerJobDetailPage,
  LazyJobseekerJobsPage,
  LazyJobseekerProfilePage,
} from './routeModules'
import { RequireCompleteProfile } from '../guards/RequireCompleteProfile'
import { JobseekerAuthPage } from '../pages/AuthPage'
import { JobseekerLandingPage } from '../pages/LandingPage'

function JobseekerRoutes() {
  const auth = useAuth()
  const authenticatedJobseeker = auth.authMe?.app_user?.app_role === 'jobseeker'
  const nextRoute = authenticatedJobseeker
    ? auth.authMe?.profile_complete
      ? '/jobs'
      : '/profile'
    : null

  return (
    <Routes>
      <Route path="/" element={<JobseekerLandingPage />} />
      <Route
        path="/auth"
        element={
          nextRoute ? (
            <Navigate replace to={nextRoute} />
          ) : (
            <JobseekerAuthPage />
          )
        }
      />
      <Route
        path="/profile"
        element={
          <RouteSuspense>
            <RequireRole role="jobseeker">
              <LazyJobseekerProfilePage />
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/jobs"
        element={
          <RouteSuspense>
            <RequireRole role="jobseeker">
              <RequireCompleteProfile>
                <LazyJobseekerJobsPage />
              </RequireCompleteProfile>
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/jobs/:jobId"
        element={
          <RouteSuspense>
            <RequireRole role="jobseeker">
              <RequireCompleteProfile>
                <LazyJobseekerJobDetailPage />
              </RequireCompleteProfile>
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route
        path="/applications"
        element={
          <RouteSuspense>
            <RequireRole role="jobseeker">
              <RequireCompleteProfile>
                <LazyJobseekerApplicationsPage />
              </RequireCompleteProfile>
            </RequireRole>
          </RouteSuspense>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function JobseekerApp({
  client = jobseekerAuthClient,
}: {
  client?: AuthClient
}) {
  return (
    <AuthProvider client={client}>
      <JobseekerRoutes />
    </AuthProvider>
  )
}
