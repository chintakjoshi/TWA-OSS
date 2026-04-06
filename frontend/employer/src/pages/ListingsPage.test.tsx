import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerListingsPage } from './ListingsPage'

test('approved employers skip applicant count probes when applicant sharing is disabled', async () => {
  const requestedPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      applicantVisibilityEnabled: false,
    }),
    requestTwaImpl: async (path) => {
      requestedPaths.push(path)

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
            page_size: 20,
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
        <EmployerListingsPage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('My listings')).toBeInTheDocument()
  expect(screen.getByText('No personal vehicle required')).toBeInTheDocument()
  expect(screen.queryByText(/^Yes$/)).not.toBeInTheDocument()
  expect(await screen.findByText('Locked')).toBeInTheDocument()

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalled()
  })

  expect(
    requestedPaths.some((path) =>
      path.includes('/api/v1/employer/listings/listing-1/applicants')
    )
  ).toBe(false)
})
