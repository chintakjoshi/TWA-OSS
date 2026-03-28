import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerProfilePage } from './ProfilePage'

test('pending employers can review their profile but cannot edit it', async () => {
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      employerReviewStatus: 'pending',
    }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/employers/me') {
        return {
          employer: {
            id: 'employer-1',
            app_user_id: 'employer-app-user',
            auth_user_id: 'employer-auth-user',
            org_name: 'Acme Logistics',
            contact_name: 'Jordan Rivers',
            phone: '314-555-0199',
            address: '123 Main St',
            city: 'St. Louis',
            zip: '63103',
            review_status: 'pending',
            review_note: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: null,
            updated_at: null,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerProfilePage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Review your employer record')
  ).toBeInTheDocument()
  expect(
    screen.getByText(/edits stay locked until staff approves the account/i)
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Organization name')).toBeDisabled()
  expect(screen.getByLabelText('Phone')).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: /save employer profile/i })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Applicants' })
  ).not.toBeInTheDocument()
})
