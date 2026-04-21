import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

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

test('admin auth keeps the user on the OTP step after an invalid code and does not show a premature success notice', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    loginResult: {
      otp_required: true,
      challenge_token: 'challenge-token',
      masked_email: 'st***@example.com',
    },
    verifyOtpError: new HttpError(400, 'Invalid OTP.', {
      code: 'invalid_otp',
      detail: 'Invalid OTP.',
    }),
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Welcome back')

  await user.type(screen.getByPlaceholderText('you@twa.slu.edu'), 'staff@example.com')
  await user.type(screen.getByPlaceholderText('Your password'), 'Password123')
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))

  await screen.findByText(/enter the code sent to st\*\*\*@example.com/i)
  expect(screen.queryByText('Signed in successfully.')).not.toBeInTheDocument()
  expect(screen.getAllByTestId('otp-digit-box')).toHaveLength(6)

  await user.type(screen.getByLabelText(/otp code/i), '999999')
  await user.click(screen.getByRole('button', { name: /verify otp/i }))

  await waitFor(() => {
    expect(spies.verifyLoginOtp).toHaveBeenCalledWith({
      challenge_token: 'challenge-token',
      code: '999999',
    })
  })
  expect(
    await screen.findByText('Invalid OTP. Please try again.')
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /verify otp/i })).toBeEnabled()
  expect(screen.getByText(/enter the code sent to st\*\*\*@example.com/i))
    .toBeInTheDocument()
})
