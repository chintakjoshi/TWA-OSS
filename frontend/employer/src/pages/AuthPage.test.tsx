import { render, screen } from '@testing-library/react'
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
