import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { ApplicantsPanel } from './ApplicantsPanel'

test('approved employers show the locked applicant panel without requesting applicants when sharing is disabled', async () => {
  const requestedPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      applicantVisibilityEnabled: false,
    }),
    requestTwaImpl: async (path) => {
      requestedPaths.push(path)
      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <ApplicantsPanel listingId="listing-1" />
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Applicant visibility is currently off')
  ).toBeInTheDocument()

  await waitFor(() => {
    expect(spies.requestTwa).not.toHaveBeenCalled()
  })
  expect(requestedPaths).toEqual([])
})
