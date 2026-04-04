import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerPortalApp } from './EmployerPortalApp'
import { employerRouteModules } from './routeModules'

afterEach(() => {
  vi.restoreAllMocks()
})

test('employer auth route does not preload workspace route chunks', async () => {
  const { client } = createMockAuthClient()
  const loadApplicantsPage = vi.spyOn(
    employerRouteModules,
    'loadApplicantsPage'
  )
  const loadDashboardPage = vi.spyOn(employerRouteModules, 'loadDashboardPage')
  const loadListingDetailPage = vi.spyOn(
    employerRouteModules,
    'loadListingDetailPage'
  )
  const loadListingsPage = vi.spyOn(employerRouteModules, 'loadListingsPage')
  const loadNewListingPage = vi.spyOn(
    employerRouteModules,
    'loadNewListingPage'
  )
  const loadProfilePage = vi.spyOn(employerRouteModules, 'loadProfilePage')
  const loadSetupPage = vi.spyOn(employerRouteModules, 'loadSetupPage')

  render(
    <MemoryRouter initialEntries={['/auth']}>
      <EmployerPortalApp client={client} />
    </MemoryRouter>
  )

  expect(await screen.findByText('Employer portal access')).toBeInTheDocument()
  expect(loadApplicantsPage).not.toHaveBeenCalled()
  expect(loadDashboardPage).not.toHaveBeenCalled()
  expect(loadListingDetailPage).not.toHaveBeenCalled()
  expect(loadListingsPage).not.toHaveBeenCalled()
  expect(loadNewListingPage).not.toHaveBeenCalled()
  expect(loadProfilePage).not.toHaveBeenCalled()
  expect(loadSetupPage).not.toHaveBeenCalled()
})

test('employer loads the dashboard route chunk only when the dashboard route is rendered', async () => {
  const { client } = createMockAuthClient({
    portal: 'employer',
    authMe: buildAuthMe({ role: 'employer' }),
  })
  const loadDashboardPage = vi
    .spyOn(employerRouteModules, 'loadDashboardPage')
    .mockResolvedValue({
      EmployerDashboardPage: () => <div>Employer dashboard chunk loaded</div>,
    } as Awaited<ReturnType<typeof employerRouteModules.loadDashboardPage>>)

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <EmployerPortalApp client={client} />
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(loadDashboardPage).toHaveBeenCalledTimes(1)
  })
  expect(
    await screen.findByText('Employer dashboard chunk loaded')
  ).toBeInTheDocument()
})
