import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { createMockAuthClient } from '../../../frontend/tests/utils/auth'
import { AuthProvider } from './AuthProvider'
import { AuthConsole } from './AuthConsole'

function renderConsole(
  client: ReturnType<typeof createMockAuthClient>['client']
) {
  return render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AuthConsole
          title="Shared auth test"
          summary="Shared auth test summary"
          supportPoints={['auth', 'bootstrap']}
        >
          <div>Authenticated content</div>
        </AuthConsole>
      </AuthProvider>
    </MemoryRouter>
  )
}

test('login form hands off to authSDK and unlocks authenticated content', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient({
    authMe: {
      app_user: null,
      profile_complete: false,
      employer_review_status: null,
      next_step: 'bootstrap_role',
    },
  })

  renderConsole(client)

  const email = await screen.findByLabelText('Email')
  const password = screen.getByLabelText('Password')
  const form = email.closest('form')

  expect(form).not.toBeNull()
  expect(email).toBeRequired()
  expect(password).toBeRequired()
  expect(password).toHaveAttribute('minlength', '8')

  await user.type(email, 'jobseeker@example.com')
  await user.type(password, 'Password123')
  await user.click(
    within(form as HTMLFormElement).getByRole('button', { name: 'Sign In' })
  )

  await waitFor(() => {
    expect(spies.login).toHaveBeenCalledWith({
      email: 'jobseeker@example.com',
      password: 'Password123',
    })
  })
  expect(await screen.findByText('Authenticated content')).toBeInTheDocument()
})

test('signup form keeps validation constraints and calls authSDK signup', async () => {
  const user = userEvent.setup()
  const { client, spies } = createMockAuthClient()

  renderConsole(client)

  await user.click(screen.getByRole('button', { name: 'Create Account' }))

  const email = await screen.findByLabelText('Email')
  const password = screen.getByLabelText('Password')
  const form = email.closest('form')

  expect(form).not.toBeNull()
  expect(email).toBeRequired()
  expect(password).toBeRequired()
  expect(password).toHaveAttribute('minlength', '8')

  await user.type(email, 'new-user@example.com')
  await user.type(password, 'Password123')
  await user.click(
    within(form as HTMLFormElement).getByRole('button', {
      name: 'Create Account',
    })
  )

  await waitFor(() => {
    expect(spies.signup).toHaveBeenCalledWith({
      email: 'new-user@example.com',
      password: 'Password123',
    })
  })
  expect(
    await screen.findByText(
      'Account created in authSDK. Sign in next to continue into TWA.'
    )
  ).toBeInTheDocument()
})
