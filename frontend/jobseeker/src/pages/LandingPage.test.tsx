import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { JobseekerLandingPage } from './LandingPage'

test('landing page uses a dedicated employer panel and removes the extra header links', () => {
  render(
    <MemoryRouter>
      <JobseekerLandingPage />
    </MemoryRouter>
  )

  expect(
    screen.queryByRole('link', { name: 'Jobseeker sign in' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: /^Employer portal$/i })
  ).not.toBeInTheDocument()
  expect(screen.queryByText('What this portal covers')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Continue to sign in' })
  ).not.toBeInTheDocument()

  const employerLink = screen.getByRole('link', {
    name: 'Open Employer Portal',
  })
  expect(employerLink).toHaveAttribute('href')
  expect(employerLink).toHaveStyle({ color: '#ffffff' })
  expect(
    screen.getByText('Hire through a dedicated employer portal.')
  ).toBeInTheDocument()
})
