import { lazyNamedRoute } from '@shared/routing/LazyRoute'

export const jobseekerRouteModules = {
  loadApplicationsPage: () => import('../pages/ApplicationsPage'),
  loadJobDetailPage: () => import('../pages/JobDetailPage'),
  loadJobsPage: () => import('../pages/JobsPage'),
  loadProfilePage: () => import('../pages/ProfilePage'),
}

export const LazyJobseekerApplicationsPage = lazyNamedRoute(
  () => jobseekerRouteModules.loadApplicationsPage(),
  'JobseekerApplicationsPage'
)

export const LazyJobseekerJobDetailPage = lazyNamedRoute(
  () => jobseekerRouteModules.loadJobDetailPage(),
  'JobseekerJobDetailPage'
)

export const LazyJobseekerJobsPage = lazyNamedRoute(
  () => jobseekerRouteModules.loadJobsPage(),
  'JobseekerJobsPage'
)

export const LazyJobseekerProfilePage = lazyNamedRoute(
  () => jobseekerRouteModules.loadProfilePage(),
  'JobseekerProfilePage'
)
