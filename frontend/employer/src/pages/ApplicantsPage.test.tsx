import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { EmployerApplicantsPage } from './ApplicantsPage'

test('rejected employers see a locked applicants page without applicant requests', async () => {
  const requestedPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({
      role: 'employer',
      employerReviewStatus: 'rejected',
    }),
    requestTwaImpl: async (path) => {
      requestedPaths.push(path)

      if (path.startsWith('/api/v1/employer/listings?')) {
        return {
          items: [],
          meta: {
            page: 1,
            page_size: 100,
            total_items: 0,
            total_pages: 0,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter initialEntries={['/applicants']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/applicants" element={<EmployerApplicantsPage />} />
          <Route path="/profile" element={<div>Profile route</div>} />
          <Route path="/my-listings" element={<div>Listings route</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(
    await screen.findByText('Applicant access is unavailable until re-approval')
  ).toBeInTheDocument()
  expect(
    screen.queryByPlaceholderText('Search name, city, or listing')
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Applicants' })
  ).not.toBeInTheDocument()

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalled()
  })

  expect(
    requestedPaths.some(
      (path) =>
        path.includes('/api/v1/employer/applicants') ||
        path.includes('/api/v1/employer/listings/') ||
        path.includes('/applicants?')
    )
  ).toBe(false)
})
