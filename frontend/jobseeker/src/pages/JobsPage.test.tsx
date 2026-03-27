import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import type { JobListItem } from '../types/jobseeker'
import { JobseekerJobsPage } from './JobsPage'

const jobs: JobListItem[] = [
  {
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
    is_eligible: true,
    ineligibility_tag: null,
    has_applied: true,
  },
  {
    job: {
      id: 'listing-2',
      employer_id: 'employer-1',
      title: 'Delivery Driver',
      description: 'Own-car route assignments.',
      location_address: '500 Market St',
      city: 'St. Louis',
      zip: '63101',
      transit_required: 'own_car',
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
    is_eligible: false,
    ineligibility_tag: 'Transit mismatch',
    has_applied: false,
  },
]

test('job board renders eligible and ineligible listings with their status labels', async () => {
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
    requestTwaImpl: async (path) => {
      if (!path.startsWith('/api/v1/jobs')) {
        throw new Error(`Unexpected path ${path}`)
      }
      return {
        items: jobs,
        meta: {
          page: 1,
          page_size: 6,
          total_items: jobs.length,
          total_pages: 1,
        },
      }
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerJobsPage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Warehouse Associate')).toBeInTheDocument()
  const alreadyAppliedBadge = screen.getByText('Already applied')
  expect(alreadyAppliedBadge).toBeInTheDocument()
  expect(alreadyAppliedBadge.closest('span')).toHaveClass('whitespace-nowrap')
  expect(screen.getByText('Transit mismatch')).toBeInTheDocument()
  expect(screen.getAllByText('Own car required').length).toBeGreaterThan(0)
  expect(screen.queryByText('Profile complete')).not.toBeInTheDocument()
  expect(spies.requestTwa).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/jobs?page=1'),
    expect.any(Object),
    undefined
  )
})
