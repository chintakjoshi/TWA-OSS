import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@shared/auth/AuthProvider'
import { RequireRole } from '@shared/auth/RouteGuards'

import { jobseekerAuthClient } from './authClient'
import { RequireCompleteProfile } from '../guards/RequireCompleteProfile'
import { JobseekerApplicationsPage } from '../pages/ApplicationsPage'
import { JobseekerAuthPage } from '../pages/AuthPage'
import { JobseekerJobDetailPage } from '../pages/JobDetailPage'
import { JobseekerJobsPage } from '../pages/JobsPage'
import { JobseekerLandingPage } from '../pages/LandingPage'
import { JobseekerProfilePage } from '../pages/ProfilePage'

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
          <RequireRole role="jobseeker">
            <JobseekerProfilePage />
          </RequireRole>
        }
      />
      <Route
        path="/jobs"
        element={
          <RequireRole role="jobseeker">
            <RequireCompleteProfile>
              <JobseekerJobsPage />
            </RequireCompleteProfile>
          </RequireRole>
        }
      />
      <Route
        path="/jobs/:jobId"
        element={
          <RequireRole role="jobseeker">
            <RequireCompleteProfile>
              <JobseekerJobDetailPage />
            </RequireCompleteProfile>
          </RequireRole>
        }
      />
      <Route
        path="/applications"
        element={
          <RequireRole role="jobseeker">
            <RequireCompleteProfile>
              <JobseekerApplicationsPage />
            </RequireCompleteProfile>
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export function JobseekerApp() {
  return (
    <AuthProvider client={jobseekerAuthClient}>
      <JobseekerRoutes />
    </AuthProvider>
  )
}
