import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerSetupPage } from './SetupPage'

test('employer setup submits bootstrap data without patching the profile', async () => {
  const user = userEvent.setup()
  const session = {
    sessionTransport: 'cookie',
  }
  const { client, spies } = createMockAuthClient({
    session,
    requestTwaImpl: async (path) => {
      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter initialEntries={['/setup']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/setup" element={<EmployerSetupPage />} />
          <Route path="/dashboard" element={<div>Dashboard route</div>} />
          <Route path="/auth" element={<div>Auth route</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Set up your employer profile')
  ).toBeInTheDocument()
  expect(screen.queryByLabelText('Address')).not.toBeInTheDocument()

  await user.type(screen.getByLabelText('Organization name'), 'Acme Logistics')
  await user.type(screen.getByLabelText('Contact name'), 'Jordan Rivers')
  await user.type(screen.getByLabelText('Phone'), '314-555-0199')
  await user.click(screen.getByRole('button', { name: 'Submit for review' }))

  await waitFor(() => {
    expect(spies.bootstrapRole).toHaveBeenCalledWith(session, {
      role: 'employer',
      employer_profile: {
        org_name: 'Acme Logistics',
        contact_name: 'Jordan Rivers',
        phone: '314-555-0199',
      },
    })
  })

  expect(spies.requestTwa).not.toHaveBeenCalled()
  expect(await screen.findByText('Dashboard route')).toBeInTheDocument()
})
