import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminPortalApp } from './AdminPortalApp'
import { adminRouteModules } from './routeModules'

afterEach(() => {
  vi.restoreAllMocks()
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
