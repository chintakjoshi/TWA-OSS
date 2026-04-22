import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminPortalApp } from './AdminPortalApp'
import { adminRouteModules } from './routeModules'

afterEach(() => {
  vi.restoreAllMocks()
})

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

test('admin auth route does not preload staff workspace route chunks', async () => {
  const { client } = createMockAuthClient()
  const loadApplicationsPage = vi.spyOn(
    adminRouteModules,
    'loadApplicationsPage'
  )
  const loadAuditLogPage = vi.spyOn(adminRouteModules, 'loadAuditLogPage')
  const loadDashboardPage = vi.spyOn(adminRouteModules, 'loadDashboardPage')
  const loadEmployersDirectoryPage = vi.spyOn(
    adminRouteModules,
    'loadEmployersDirectoryPage'
  )
  const loadEmployersPage = vi.spyOn(adminRouteModules, 'loadEmployersPage')
  const loadJobseekersPage = vi.spyOn(adminRouteModules, 'loadJobseekersPage')
  const loadListingMatchesPage = vi.spyOn(
    adminRouteModules,
    'loadListingMatchesPage'
  )
  const loadListingQueuePage = vi.spyOn(
    adminRouteModules,
    'loadListingQueuePage'
  )
  const loadListingsPage = vi.spyOn(adminRouteModules, 'loadListingsPage')
  const loadMatchesPage = vi.spyOn(adminRouteModules, 'loadMatchesPage')
  const loadNotificationsPage = vi.spyOn(
    adminRouteModules,
    'loadNotificationsPage'
  )
  const loadSecurityPage = vi.spyOn(adminRouteModules, 'loadSecurityPage')

  render(
    <MemoryRouter initialEntries={['/auth']}>
      <AdminPortalApp client={client} />
    </MemoryRouter>
  )

  expect(await screen.findByText('Welcome back')).toBeInTheDocument()
  expect(loadApplicationsPage).not.toHaveBeenCalled()
  expect(loadAuditLogPage).not.toHaveBeenCalled()
  expect(loadDashboardPage).not.toHaveBeenCalled()
  expect(loadEmployersDirectoryPage).not.toHaveBeenCalled()
  expect(loadEmployersPage).not.toHaveBeenCalled()
  expect(loadJobseekersPage).not.toHaveBeenCalled()
  expect(loadListingMatchesPage).not.toHaveBeenCalled()
  expect(loadListingQueuePage).not.toHaveBeenCalled()
  expect(loadListingsPage).not.toHaveBeenCalled()
  expect(loadMatchesPage).not.toHaveBeenCalled()
  expect(loadNotificationsPage).not.toHaveBeenCalled()
  expect(loadSecurityPage).not.toHaveBeenCalled()
})

test('admin loads the dashboard route chunk only when the dashboard route is rendered', async () => {
  const { client } = createMockAuthClient({
    portal: 'staff',
    authMe: buildAuthMe({ role: 'staff' }),
  })
  const loadDashboardPage = vi
    .spyOn(adminRouteModules, 'loadDashboardPage')
    .mockResolvedValue({
      AdminDashboardPage: () => <div>Admin dashboard chunk loaded</div>,
    } as Awaited<ReturnType<typeof adminRouteModules.loadDashboardPage>>)

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AdminPortalApp client={client} />
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(loadDashboardPage).toHaveBeenCalledTimes(1)
  })
  expect(
    await screen.findByText('Admin dashboard chunk loaded')
  ).toBeInTheDocument()
})

test('a thrown error in a lazy route is contained by the route error boundary', async () => {
  const { client } = createMockAuthClient({
    portal: 'staff',
    authMe: buildAuthMe({ role: 'staff' }),
  })

  function ExplodingPage(): never {
    throw new Error('simulated route crash')
  }

  // Use a route whose lazy module hasn't been resolved elsewhere in this
  // file; React.lazy memoises the first resolved value per component
  // reference, so reusing a previously-loaded route would ignore this mock.
  vi.spyOn(adminRouteModules, 'loadApplicationsPage').mockResolvedValue({
    AdminApplicationsPage: ExplodingPage,
  } as Awaited<ReturnType<typeof adminRouteModules.loadApplicationsPage>>)

  render(
    <MemoryRouter initialEntries={['/applications']}>
      <AdminPortalApp client={client} />
    </MemoryRouter>
  )

  // Instead of the app going blank, the boundary renders a recoverable
  // fallback with retry controls.
  expect(
    await screen.findByRole('heading', { name: /something went wrong/i })
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
})
