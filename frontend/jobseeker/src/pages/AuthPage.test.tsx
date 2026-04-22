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
      email_otp_enabled: false,
      employer_review_status: null,
      employer_capabilities: null,
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
        sessionTransport: 'cookie',
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
  expect(screen.queryByText(/linked to the/i)).not.toBeInTheDocument()
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

test('jobseeker auth clears wrong-portal sessions without leaking the linked role', async () => {
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'employer' }),
    portal: 'jobseeker',
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Jobseeker portal access')

  expect(spies.logout).toHaveBeenCalled()
  expect(screen.queryByText(/linked to the/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/workspace stays locked/i)).not.toBeInTheDocument()
})

test('jobseeker auth surfaces logout failures for authenticated users', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: true }),
    logoutError: new Error('Logout failed.'),
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Your jobseeker workspace is unlocked.')
  await user.click(screen.getByRole('button', { name: 'Sign out' }))

  await waitFor(() => {
    expect(screen.getByText('Logout failed.')).toBeInTheDocument()
  })
  expect(
    screen.getByText('Your jobseeker workspace is unlocked.')
  ).toBeInTheDocument()
  expect(spies.logout).toHaveBeenCalled()
})

test('jobseeker auth renders OTP entry as six visual boxes', async () => {
  const user = userEvent.setup()
  const { client } = createMockAuthClient({
    loginResult: {
      otp_required: true,
      challenge_token: 'challenge-token',
      masked_email: 'jo***@example.com',
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Jobseeker portal access')

  await user.type(
    screen.getByPlaceholderText('you@example.com'),
    'jobseeker@example.com'
  )
  await user.type(screen.getByPlaceholderText('Your password'), 'Password123')
  await user.click(screen.getAllByRole('button', { name: /^sign in$/i })[1]!)

  await screen.findByText(/enter the code sent to jo\*\*\*@example.com/i)
  expect(screen.getAllByTestId('otp-digit-box')).toHaveLength(6)
  expect(
    screen.queryByRole('button', { name: /^sign in$/i })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^register$/i })
  ).not.toBeInTheDocument()
})
