import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { JobseekerAuthPage } from './AuthPage'

test('jobseeker bootstrap transitions the authenticated user into the local TWA flow', async () => {
  const user = userEvent.setup()
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

  await user.click(
    await screen.findByRole('button', { name: 'Bootstrap as Jobseeker' })
  )

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
