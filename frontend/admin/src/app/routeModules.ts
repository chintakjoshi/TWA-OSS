import { lazyNamedRoute } from '@shared/routing/LazyRoute'

export const adminRouteModules = {
  loadApplicationsPage: () => import('../pages/ApplicationsPage'),
  loadAuditLogPage: () => import('../pages/AuditLogPage'),
  loadDashboardPage: () => import('../pages/DashboardPage'),
  loadEmployersDirectoryPage: () => import('../pages/EmployersDirectoryPage'),
  loadEmployersPage: () => import('../pages/EmployersPage'),
  loadJobseekersPage: () => import('../pages/JobseekersPage'),
  loadListingMatchesPage: () => import('../pages/ListingMatchesPage'),
  loadListingQueuePage: () => import('../pages/ListingQueuePage'),
  loadListingsPage: () => import('../pages/ListingsPage'),
  loadMatchesPage: () => import('../pages/MatchesPage'),
  loadNotificationsPage: () => import('../pages/NotificationsPage'),
  loadSessionsPage: () => import('../pages/SessionsPage'),
  loadSecurityPage: () => import('../pages/SecurityPage'),
}

export const LazyAdminApplicationsPage = lazyNamedRoute(
  () => adminRouteModules.loadApplicationsPage(),
  'AdminApplicationsPage'
)

export const LazyAdminAuditLogPage = lazyNamedRoute(
  () => adminRouteModules.loadAuditLogPage(),
  'AdminAuditLogPage'
)

export const LazyAdminDashboardPage = lazyNamedRoute(
  () => adminRouteModules.loadDashboardPage(),
  'AdminDashboardPage'
)

export const LazyAdminEmployersDirectoryPage = lazyNamedRoute(
  () => adminRouteModules.loadEmployersDirectoryPage(),
  'AdminEmployersDirectoryPage'
)

export const LazyAdminEmployersPage = lazyNamedRoute(
  () => adminRouteModules.loadEmployersPage(),
  'AdminEmployersPage'
)

export const LazyAdminJobseekersPage = lazyNamedRoute(
  () => adminRouteModules.loadJobseekersPage(),
  'AdminJobseekersPage'
)

export const LazyAdminListingMatchesPage = lazyNamedRoute(
  () => adminRouteModules.loadListingMatchesPage(),
  'AdminListingMatchesPage'
)

export const LazyAdminListingQueuePage = lazyNamedRoute(
  () => adminRouteModules.loadListingQueuePage(),
  'AdminListingQueuePage'
)

export const LazyAdminListingsPage = lazyNamedRoute(
  () => adminRouteModules.loadListingsPage(),
  'AdminListingsPage'
)

export const LazyAdminMatchesPage = lazyNamedRoute(
  () => adminRouteModules.loadMatchesPage(),
  'AdminMatchesPage'
)

export const LazyAdminNotificationsPage = lazyNamedRoute(
  () => adminRouteModules.loadNotificationsPage(),
  'AdminNotificationsPage'
)

export const LazyAdminSessionsPage = lazyNamedRoute(
  () => adminRouteModules.loadSessionsPage(),
  'AdminSessionsPage'
)

export const LazyAdminSecurityPage = lazyNamedRoute(
  () => adminRouteModules.loadSecurityPage(),
  'AdminSecurityPage'
)
