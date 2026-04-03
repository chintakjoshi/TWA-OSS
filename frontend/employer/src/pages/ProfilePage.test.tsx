import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import type { EmployerProfile } from '../types/employer'
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

test('approved employers are returned to review after saving profile changes', async () => {
  const user = userEvent.setup()
  const profile: EmployerProfile = {
    id: 'employer-1',
    app_user_id: 'employer-app-user',
    auth_user_id: 'employer-auth-user',
    org_name: 'Acme Logistics',
    contact_name: 'Jordan Rivers',
    phone: '314-555-0199',
    address: '123 Main St',
    city: 'St. Louis',
    zip: '63103',
    review_status: 'approved',
    review_note: 'Approved for pilot access.',
    reviewed_by: 'staff-user-1',
    reviewed_at: '2026-03-20T12:00:00.000Z',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-20T12:00:00.000Z',
  }

  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      employerReviewStatus: 'approved',
    }),
    requestTwaImpl: async (path, init, state) => {
      if (path !== '/api/v1/employers/me') {
        throw new Error(`Unexpected TWA request for ${path}`)
      }

      if (!init?.method || init.method === 'GET') {
        return { employer: profile }
      }

      if (init.method === 'PATCH') {
        const payload = JSON.parse(String(init.body)) as {
          org_name: string
          contact_name: string | null
          phone: string | null
          address: string | null
          city: string | null
          zip: string | null
        }

        profile.address = payload.address
        profile.city = payload.city
        profile.zip = payload.zip
        profile.review_status = 'pending'
        profile.review_note = null
        profile.reviewed_by = null
        profile.reviewed_at = null
        profile.updated_at = '2026-03-26T12:00:00.000Z'
        state.authMe = buildAuthMe({
          role: 'employer',
          employerReviewStatus: 'pending',
        })

        return { employer: profile }
      }

      throw new Error(`Unexpected TWA method ${init.method}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerProfilePage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Keep your employer record current')
  await user.clear(screen.getByLabelText('Address'))
  await user.type(screen.getByLabelText('Address'), '500 Market St')
  const callCountBeforeSave = spies.requestTwa.mock.calls.length
  await user.click(
    screen.getByRole('button', { name: /save employer profile/i })
  )

  expect(
    await screen.findByText(
      /are you sure you want to make changes, making changes will set the employer profile to pending review and you won't be able to submit new job listings\./i
    )
  ).toBeInTheDocument()
  expect(spies.requestTwa).toHaveBeenCalledTimes(callCountBeforeSave)
  await user.click(screen.getByRole('button', { name: /yes, save changes/i }))

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalledWith(
      '/api/v1/employers/me',
      expect.any(Object),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          org_name: 'Acme Logistics',
          contact_name: 'Jordan Rivers',
          phone: '314-555-0199',
          address: '500 Market St',
          city: 'St. Louis',
          zip: '63103',
        }),
      })
    )
  })

  expect(
    await screen.findByText(/your account is back in staff review/i)
  ).toBeInTheDocument()
  expect(
    screen.getByText(/edits stay locked until staff approves the account/i)
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Address')).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: /save employer profile/i })
  ).not.toBeInTheDocument()
})
