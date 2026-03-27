import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { JobseekerJobDetailPage } from './JobDetailPage'

test('job detail disables applying when the listing was already applied to', async () => {
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
    requestTwaImpl: async (path) => {
      if (path !== '/api/v1/jobs/listing-1') {
        throw new Error(`Unexpected path ${path}`)
      }

      return {
        job: {
          id: 'listing-1',
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
          created_at: null,
          updated_at: null,
        },
        eligibility: {
          is_eligible: true,
          ineligibility_tag: null,
          has_applied: true,
        },
      }
    },
  })

  render(
    <MemoryRouter initialEntries={['/jobs/listing-1']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobseekerJobDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Warehouse Associate')).toBeInTheDocument()
  expect(screen.getAllByText('Already applied').length).toBeGreaterThan(0)
  expect(screen.getByRole('button', { name: 'Already applied' })).toBeDisabled()
})
