import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'
import { AdminSecurityPage } from './SecurityPage'

test('staff can enable MFA after confirming the warning modal', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'staff',
      emailOtpEnabled: false,
    }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        return {
          pending_employers: 0,
          pending_listings: 0,
          active_jobseekers: 0,
          open_applications: 0,
          open_listings: 0,
        }
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return {
          items: [],
          meta: {
            page: 1,
            page_size: 8,
            total_items: 0,
            total_pages: 0,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminSecurityPage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  const toggle = await screen.findByRole('switch', {
    name: /multi-factor authentication/i,
  })
  expect(toggle).toHaveAttribute('aria-checked', 'false')

  await user.click(toggle)

  expect(
    await screen.findByText(
      /are you sure you want to enable multi-factor authentication/i
    )
  ).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /yes, enable mfa/i }))

  await waitFor(() => {
    expect(spies.enableEmailOtp).toHaveBeenCalledTimes(1)
  })
  expect(
    await screen.findByText(/multi-factor authentication is now enabled/i)
  ).toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('staff must confirm before the disable MFA OTP is sent', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'staff',
      emailOtpEnabled: true,
    }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        return {
          pending_employers: 0,
          pending_listings: 0,
          active_jobseekers: 0,
          open_applications: 0,
          open_listings: 0,
        }
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return {
          items: [],
          meta: {
            page: 1,
            page_size: 8,
            total_items: 0,
            total_pages: 0,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminSecurityPage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  const toggle = await screen.findByRole('switch', {
    name: /multi-factor authentication/i,
  })
  expect(toggle).toHaveAttribute('aria-checked', 'true')

  await user.click(toggle)

  expect(
    await screen.findByText(
      /are you sure you want to disable multi-factor authentication/i
    )
  ).toBeInTheDocument()
  expect(spies.requestActionOtp).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: /yes, send otp/i }))

  await waitFor(() => {
    expect(spies.requestActionOtp).toHaveBeenCalledWith({
      action: 'disable_otp',
    })
  })
  expect(
    await screen.findByText(/enter the otp code sent to your email/i)
  ).toBeInTheDocument()
  expect(screen.getAllByTestId('otp-digit-box')).toHaveLength(6)

  await user.type(screen.getByLabelText(/otp code/i), '123456')
  await user.click(screen.getByRole('button', { name: /turn off mfa/i }))

  await waitFor(() => {
    expect(spies.verifyActionOtp).toHaveBeenCalledWith({
      action: 'disable_otp',
      code: '123456',
    })
  })
  expect(spies.disableEmailOtp).toHaveBeenCalledWith('mock-action-token')
  expect(
    await screen.findByText(/multi-factor authentication is now disabled/i)
  ).toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-checked', 'false')
})
