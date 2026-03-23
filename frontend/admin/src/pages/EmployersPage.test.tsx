import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'
import type { EmployerProfile } from '../types/admin'
import { AdminEmployersPage } from './EmployersPage'

const employer: EmployerProfile = {
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
}

test('staff can review an employer from the queue and persist the review action', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path, init) => {
      if (path.startsWith('/api/v1/admin/queue/employers')) {
        return {
          items: [employer],
          meta: { page: 1, page_size: 8, total_items: 1, total_pages: 1 },
        }
      }
      if (path.startsWith('/api/v1/admin/employers?')) {
        return {
          items: [employer],
          meta: { page: 1, page_size: 8, total_items: 1, total_pages: 1 },
        }
      }
      if (path === `/api/v1/admin/employers/${employer.id}`) {
        expect(init?.method).toBe('PATCH')
        return {
          employer: {
            ...employer,
            review_status: 'approved',
            review_note: 'Approved for pilot access.',
          },
        }
      }
      throw new Error(`Unexpected path ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminEmployersPage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect((await screen.findAllByText('Pending Org')).length).toBeGreaterThan(0)

  await user.click(screen.getByRole('button', { name: 'Open review' }))
  await user.selectOptions(
    await screen.findByLabelText('Review status'),
    'approved'
  )
  await user.clear(screen.getByLabelText('Staff note'))
  await user.type(
    screen.getByLabelText('Staff note'),
    'Approved for pilot access.'
  )
  await user.click(screen.getByRole('button', { name: 'Save review' }))

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalledWith(
      `/api/v1/admin/employers/${employer.id}`,
      expect.any(Object),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          review_status: 'approved',
          review_note: 'Approved for pilot access.',
        }),
      })
    )
  })
})
