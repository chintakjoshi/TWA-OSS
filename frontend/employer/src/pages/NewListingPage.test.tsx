import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerNewListingPage } from './NewListingPage'

test('approved employers can submit a listing and navigate to the listing detail page', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      employerReviewStatus: 'approved',
    }),
    requestTwaImpl: async (path, init) => {
      if (path !== '/api/v1/employer/listings') {
        throw new Error(`Unexpected path ${path}`)
      }
      expect(init?.method).toBe('POST')
      return {
        listing: {
          id: 'listing-123',
          employer_id: 'employer-1',
          title: 'Warehouse Associate',
          description: 'Day shift warehouse work.',
          location_address: '123 Main St',
          city: 'St. Louis',
          zip: '63103',
          transit_required: 'any',
          disqualifying_charges: {
            sex_offense: false,
            violent: false,
            armed: false,
            children: false,
            drug: true,
            theft: false,
          },
          transit_accessible: true,
          job_lat: null,
          job_lon: null,
          review_status: 'pending',
          lifecycle_status: 'open',
          review_note: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: null,
          updated_at: null,
        },
      }
    },
  })

  render(
    <MemoryRouter initialEntries={['/listings/new']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/listings/new" element={<EmployerNewListingPage />} />
          <Route
            path="/listings/:listingId"
            element={<div>Listing detail page</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  await user.type(
    await screen.findByLabelText('Job title'),
    'Warehouse Associate'
  )
  await user.type(
    screen.getByLabelText('Description'),
    'Day shift warehouse work.'
  )
  await user.type(screen.getByLabelText('Address'), '123 Main St')
  await user.type(screen.getByLabelText('City'), 'St. Louis')
  await user.type(screen.getByLabelText('ZIP code'), '63103')
  await user.click(screen.getByLabelText('Drug offense'))
  await user.click(screen.getByRole('button', { name: 'Submit listing' }))

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalledWith(
      '/api/v1/employer/listings',
      expect.any(Object),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Warehouse Associate',
          description: 'Day shift warehouse work.',
          location_address: '123 Main St',
          city: 'St. Louis',
          zip: '63103',
          transit_required: 'any',
          disqualifying_charges: {
            sex_offense: false,
            violent: false,
            armed: false,
            children: false,
            drug: true,
            theft: false,
          },
        }),
      })
    )
  })

  expect(await screen.findByText('Listing detail page')).toBeInTheDocument()
})
