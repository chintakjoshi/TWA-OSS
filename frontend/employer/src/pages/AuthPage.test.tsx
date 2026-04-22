import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerAuthPage } from './AuthPage'

test('employer auth clears wrong-portal sessions without leaking the linked role', async () => {
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker' }),
    portal: 'employer',
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Employer portal access')

  expect(spies.logout).toHaveBeenCalled()
  expect(screen.queryByText(/linked to the/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/workspace stays locked/i)).not.toBeInTheDocument()
})

test('employer auth renders OTP entry as six visual boxes', async () => {
  const user = userEvent.setup()
  const { client } = createMockAuthClient({
    loginResult: {
      otp_required: true,
      challenge_token: 'challenge-token',
      masked_email: 'em***@example.com',
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <EmployerAuthPage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Employer portal access')

  await user.type(
    screen.getByPlaceholderText('you@yourcompany.com'),
    'employer@example.com'
  )
  await user.type(screen.getByPlaceholderText('Your password'), 'Password123')
  await user.click(screen.getAllByRole('button', { name: /^sign in$/i })[1]!)

  await screen.findByText(/enter the code sent to em\*\*\*@example.com/i)
  expect(screen.getAllByTestId('otp-digit-box')).toHaveLength(6)
  expect(
    screen.queryByRole('button', { name: /^sign in$/i })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^register$/i })
  ).not.toBeInTheDocument()
})
