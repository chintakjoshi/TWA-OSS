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
          eligibility_note: null,
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

test('job detail keeps apply enabled when distance is unavailable', async () => {
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
    requestTwaImpl: async (path) => {
      if (path !== '/api/v1/jobs/listing-2') {
        throw new Error(`Unexpected path ${path}`)
      }

      return {
        job: {
          id: 'listing-2',
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
          eligibility_note:
            'Unable to provide distance for this listing right now.',
          has_applied: false,
        },
      }
    },
  })

  render(
    <MemoryRouter initialEntries={['/jobs/listing-2']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobseekerJobDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Community Support Role')).toBeInTheDocument()
  expect(
    screen.getByText('Unable to provide distance for this listing right now.')
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Apply for This Job' })
  ).toBeEnabled()
})

test('job detail separates car requirement from transit availability', async () => {
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
    requestTwaImpl: async (path) => {
      if (path !== '/api/v1/jobs/listing-3') {
        throw new Error(`Unexpected path ${path}`)
      }

      return {
        job: {
          id: 'listing-3',
          employer_id: 'employer-1',
          title: 'Neighborhood Outreach Role',
          description: 'Field outreach in areas with limited route access.',
          location_address: '900 Pine St',
          city: 'St. Louis',
          zip: '63102',
          transit_required: 'any',
          disqualifying_charges: {
            sex_offense: false,
            violent: false,
            armed: false,
            children: false,
            drug: false,
            theft: false,
          },
          transit_accessible: false,
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
          is_eligible: false,
          ineligibility_tag: '12.3 miles from your zip code',
          eligibility_note: null,
          has_applied: false,
        },
      }
    },
  })

  render(
    <MemoryRouter initialEntries={['/jobs/listing-3']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobseekerJobDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Neighborhood Outreach Role')).toBeInTheDocument()
  expect(screen.getByText('No car required')).toBeInTheDocument()
  expect(
    screen.getByText('This listing does not require access to a personal vehicle.')
  ).toBeInTheDocument()
  expect(
    screen.getByText('Transit access is not currently available for this listing.')
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Apply for This Job' })
  ).toBeDisabled()
  expect(screen.queryByText('Transit friendly')).not.toBeInTheDocument()
  expect(
    screen.queryByText(
      'This listing accepts public transit and other reachable options.'
    )
  ).not.toBeInTheDocument()
})
