import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'
import type { JobListing } from '../types/admin'
import { AdminListingQueuePage } from './ListingQueuePage'

const listing: JobListing = {
  id: 'listing-1',
  employer_id: 'employer-1',
  title: 'Community Support Role',
  description: 'Outreach work with flexible travel planning.',
  location_address: '700 Olive St',
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
  transit_accessible: null,
  job_lat: null,
  job_lon: null,
  review_status: 'pending',
  lifecycle_status: 'open',
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-03-18T12:00:00Z',
  updated_at: '2026-03-18T12:00:00Z',
  employer: {
    id: 'employer-1',
    app_user_id: 'app-user-1',
    auth_user_id: 'auth-user-1',
    org_name: 'Pending Org',
    contact_name: 'Sam Carter',
    phone: '3145550199',
    address: '500 Market St',
    city: 'St. Louis',
    zip: '63101',
    review_status: 'pending',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-03-18T12:00:00Z',
    updated_at: '2026-03-18T12:00:00Z',
    profile_changes: null,
  },
}

test('listing queue shows unknown transit status when accessibility has not been computed', async () => {
  const user = userEvent.setup()
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        return {
          pending_employers: 0,
          pending_listings: 1,
          active_jobseekers: 5,
          open_applications: 2,
          open_listings: 3,
        }
      }
      if (path.startsWith('/api/v1/admin/queue/listings')) {
        return {
          items: [listing],
          meta: { page: 1, page_size: 8, total_items: 1, total_pages: 1 },
        }
      }
      throw new Error(`Unexpected path ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminListingQueuePage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Community Support Role')).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'Unknown' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Review' }))

  expect(await screen.findByText('Review Community Support Role')).toBeInTheDocument()
  expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
})
