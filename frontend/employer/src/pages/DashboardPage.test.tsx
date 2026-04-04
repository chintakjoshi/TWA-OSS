import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerDashboardPage } from './DashboardPage'

test('approved employers skip applicant metric requests when sharing is disabled in auth context', async () => {
  const requestedPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      applicantVisibilityEnabled: false,
    }),
    requestTwaImpl: async (path) => {
      requestedPaths.push(path)

      if (path === '/api/v1/employers/me') {
        return {
          employer: {
            id: 'employer-1',
            app_user_id: 'employer-app-user',
            org_name: 'Northside Logistics',
            contact_name: 'Jordan Blake',
            phone: '3145550101',
            address: '500 Market St',
            city: 'St. Louis',
            zip: '63101',
            review_status: 'approved',
            review_note: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
          },
        }
      }

      if (path.startsWith('/api/v1/employer/listings?')) {
        return {
          items: [
            {
              id: 'listing-1',
              employer_id: 'employer-1',
              title: 'Warehouse Associate',
              description: null,
              location_address: null,
              city: 'St. Louis',
              zip: '63101',
              transit_required: 'any',
              disqualifying_charges: {
                sex_offense: false,
                violent: false,
                armed: false,
                children: false,
                drug: false,
                theft: false,
              },
              transit_accessible: true,
              job_lat: null,
              job_lon: null,
              review_status: 'approved',
              lifecycle_status: 'open',
              review_note: null,
              reviewed_by: null,
              reviewed_at: null,
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z',
            },
          ],
          meta: {
            page: 1,
            page_size: 100,
            total_items: 1,
            total_pages: 1,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerDashboardPage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Welcome, Jordan Blake from Northside Logistics.')
  ).toBeInTheDocument()
  expect(await screen.findAllByText('Locked')).toHaveLength(2)

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalled()
  })

  expect(
    requestedPaths.some((path) =>
      path.startsWith('/api/v1/employer/applicants')
    )
  ).toBe(false)
})

test('approved employers fall back to locked metrics when applicant visibility is disabled after hydration', async () => {
  const requestedPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      applicantVisibilityEnabled: true,
    }),
    requestTwaImpl: async (path) => {
      requestedPaths.push(path)

      if (path === '/api/v1/employers/me') {
        return {
          employer: {
            id: 'employer-1',
            app_user_id: 'employer-app-user',
            org_name: 'Northside Logistics',
            contact_name: 'Jordan Blake',
            phone: '3145550101',
            address: '500 Market St',
            city: 'St. Louis',
            zip: '63101',
            review_status: 'approved',
            review_note: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
          },
        }
      }

      if (path.startsWith('/api/v1/employer/listings?')) {
        return {
          items: [
            {
              id: 'listing-1',
              employer_id: 'employer-1',
              title: 'Warehouse Associate',
              description: null,
              location_address: null,
              city: 'St. Louis',
              zip: '63101',
              transit_required: 'any',
              disqualifying_charges: {
                sex_offense: false,
                violent: false,
                armed: false,
                children: false,
                drug: false,
                theft: false,
              },
              transit_accessible: true,
              job_lat: null,
              job_lon: null,
              review_status: 'approved',
              lifecycle_status: 'open',
              review_note: null,
              reviewed_by: null,
              reviewed_at: null,
              created_at: '2026-04-01T00:00:00Z',
              updated_at: '2026-04-01T00:00:00Z',
            },
          ],
          meta: {
            page: 1,
            page_size: 100,
            total_items: 1,
            total_pages: 1,
          },
        }
      }

      if (path.startsWith('/api/v1/employer/applicants')) {
        throw new HttpError(403, 'Applicant visibility is currently off.', {
          code: 'APPLICANT_VISIBILITY_DISABLED',
          detail: 'Applicant visibility is currently off.',
        })
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerDashboardPage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Welcome, Jordan Blake from Northside Logistics.')
  ).toBeInTheDocument()
  expect(await screen.findAllByText('Locked')).toHaveLength(2)
  expect(screen.queryByText('Dashboard unavailable')).not.toBeInTheDocument()

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalled()
  })

  expect(
    requestedPaths.filter((path) =>
      path.startsWith('/api/v1/employer/applicants')
    )
  ).toHaveLength(2)
})
