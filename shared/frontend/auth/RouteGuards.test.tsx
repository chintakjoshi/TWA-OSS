import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import {
  buildAuthMe,
  createMockAuthClient,
} from '../../../frontend/tests/utils/auth'
import { AuthProvider } from './AuthProvider'
import { RequireRole } from './RouteGuards'

function renderGuard(
  client: ReturnType<typeof createMockAuthClient>['client']
) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/auth" element={<div>Auth screen</div>} />
          <Route
            path="/protected"
            element={
              <RequireRole role="jobseeker">
                <div>Protected content</div>
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

test('protected routes redirect anonymous users to the auth screen', async () => {
  const { client } = createMockAuthClient()

  renderGuard(client)

  expect(await screen.findByText('Auth screen')).toBeInTheDocument()
})

test('protected routes show a role mismatch fallback for the wrong local role', async () => {
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'employer' }),
  })

  renderGuard(client)

  expect(
    await screen.findByText('This portal is role-specific.')
  ).toBeInTheDocument()
  expect(screen.getByText(/currently linked to employer/i)).toBeInTheDocument()
})
