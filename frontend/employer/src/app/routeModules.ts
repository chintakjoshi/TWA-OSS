import { lazyNamedRoute } from '@shared/routing/LazyRoute'

export const employerRouteModules = {
  loadApplicantsPage: () => import('../pages/ApplicantsPage'),
  loadDashboardPage: () => import('../pages/DashboardPage'),
  loadListingDetailPage: () => import('../pages/ListingDetailPage'),
  loadListingsPage: () => import('../pages/ListingsPage'),
  loadNewListingPage: () => import('../pages/NewListingPage'),
  loadProfilePage: () => import('../pages/ProfilePage'),
  loadSetupPage: () => import('../pages/SetupPage'),
}

export const LazyEmployerApplicantsPage = lazyNamedRoute(
  () => employerRouteModules.loadApplicantsPage(),
  'EmployerApplicantsPage'
)

export const LazyEmployerDashboardPage = lazyNamedRoute(
  () => employerRouteModules.loadDashboardPage(),
  'EmployerDashboardPage'
)

export const LazyEmployerListingDetailPage = lazyNamedRoute(
  () => employerRouteModules.loadListingDetailPage(),
  'EmployerListingDetailPage'
)

export const LazyEmployerListingsPage = lazyNamedRoute(
  () => employerRouteModules.loadListingsPage(),
  'EmployerListingsPage'
)

export const LazyEmployerNewListingPage = lazyNamedRoute(
  () => employerRouteModules.loadNewListingPage(),
  'EmployerNewListingPage'
)

export const LazyEmployerProfilePage = lazyNamedRoute(
  () => employerRouteModules.loadProfilePage(),
  'EmployerProfilePage'
)

export const LazyEmployerSetupPage = lazyNamedRoute(
  () => employerRouteModules.loadSetupPage(),
  'EmployerSetupPage'
)
