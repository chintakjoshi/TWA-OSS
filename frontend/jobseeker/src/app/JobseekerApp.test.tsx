import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { JobseekerApp } from './JobseekerApp'
import { jobseekerRouteModules } from './routeModules'

afterEach(() => {
  vi.restoreAllMocks()
})

test('jobseeker entry route does not preload authenticated route chunks', async () => {
  const { client } = createMockAuthClient()
  const loadApplicationsPage = vi.spyOn(
    jobseekerRouteModules,
    'loadApplicationsPage'
  )
  const loadJobDetailPage = vi.spyOn(jobseekerRouteModules, 'loadJobDetailPage')
  const loadJobsPage = vi.spyOn(jobseekerRouteModules, 'loadJobsPage')
  const loadProfilePage = vi.spyOn(jobseekerRouteModules, 'loadProfilePage')

  render(
    <MemoryRouter initialEntries={['/']}>
      <JobseekerApp client={client} />
    </MemoryRouter>
  )

  expect(
    await screen.findByText(
      'Find your next chapter with a clearer path forward.'
    )
  ).toBeInTheDocument()
  expect(loadApplicationsPage).not.toHaveBeenCalled()
  expect(loadJobDetailPage).not.toHaveBeenCalled()
  expect(loadJobsPage).not.toHaveBeenCalled()
  expect(loadProfilePage).not.toHaveBeenCalled()
})

test('jobseeker loads the jobs route chunk only when the jobs route is rendered', async () => {
  const { client } = createMockAuthClient({
    portal: 'jobseeker',
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
  })
  const loadJobsPage = vi
    .spyOn(jobseekerRouteModules, 'loadJobsPage')
    .mockResolvedValue({
      JobseekerJobsPage: () => <div>Jobs route chunk loaded</div>,
    } as Awaited<ReturnType<typeof jobseekerRouteModules.loadJobsPage>>)

  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <JobseekerApp client={client} />
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(loadJobsPage).toHaveBeenCalledTimes(1)
  })
  expect(await screen.findByText('Jobs route chunk loaded')).toBeInTheDocument()
})
