import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { JobseekerAuthPage } from './AuthPage'

test('jobseeker auth automatically bootstraps first-login users into the local TWA flow', async () => {
  const { client, spies } = createMockAuthClient({
    authMe: {
      app_user: null,
      profile_complete: false,
      employer_review_status: null,
      next_step: 'bootstrap_role',
    },
    onBootstrap: (_payload, state) => {
      state.authMe = buildAuthMe({ role: 'jobseeker', profileComplete: false })
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Preparing your profile setup.')
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Bootstrap as Jobseeker' })
  ).not.toBeInTheDocument()

  await waitFor(() => {
    expect(spies.bootstrapRole).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      }),
      { role: 'jobseeker' }
    )
  })

  expect(
    await screen.findByText('Your jobseeker workspace is unlocked.')
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Complete profile' })
  ).toHaveAttribute('href', '/profile')
})

test('auth screen removes shared-auth copy and toggles password visibility', async () => {
  const user = userEvent.setup()
  const { client } = createMockAuthClient()

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Jobseeker portal access')

  const passwordInput = screen.getByPlaceholderText(
    'Your password'
  ) as HTMLInputElement

  expect(passwordInput.type).toBe('password')
  expect(screen.queryByText(/shared auth/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/staff portal/i)).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /manual reset/i })
  ).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Show password' }))
  expect(passwordInput.type).toBe('text')

  await user.click(screen.getByRole('button', { name: 'Hide password' }))
  expect(passwordInput.type).toBe('password')

  const employerLink = screen.getByRole('link', { name: 'Employer Portal' })
  expect(employerLink).toHaveAttribute('href')
})
