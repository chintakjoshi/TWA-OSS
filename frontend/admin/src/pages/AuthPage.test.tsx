import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminAuthPage } from './AuthPage'

test('admin auth clears wrong-portal sessions without leaking the linked role', async () => {
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker' }),
    portal: 'staff',
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Welcome back')

  expect(spies.logout).toHaveBeenCalled()
  expect(screen.queryByText(/linked to the/i)).not.toBeInTheDocument()
  expect(
    screen.queryByText(/staff routes stay locked/i)
  ).not.toBeInTheDocument()
})

test('admin auth surfaces logout failures for authenticated staff', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    logoutError: new Error('Logout failed.'),
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Open dashboard')
  await user.click(screen.getByRole('button', { name: 'Sign out' }))

  await waitFor(() => {
    expect(screen.getByText('Logout failed.')).toBeInTheDocument()
  })
  expect(screen.getByText('Open dashboard')).toBeInTheDocument()
  expect(spies.logout).toHaveBeenCalled()
})
