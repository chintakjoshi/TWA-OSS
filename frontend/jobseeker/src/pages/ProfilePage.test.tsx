import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import type { JobseekerProfile } from '../types/jobseeker'
import { JobseekerProfilePage } from './ProfilePage'

function isProfileComplete(profile: JobseekerProfile) {
  return Boolean(
    profile.full_name?.trim() &&
    profile.phone?.trim() &&
    profile.address?.trim() &&
    profile.city?.trim() &&
    profile.zip?.trim() &&
    profile.transit_type
  )
}

function getFieldElement(labelText: string) {
  const label = screen.getByText(labelText)
  const field = label.parentElement?.querySelector('input, select')
  if (
    !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)
  ) {
    throw new Error(`Field for ${labelText} not found`)
  }
  return field
}

function getButtonByLeadingText(text: string) {
  const button = screen
    .getAllByRole('button')
    .find((item) => item.textContent?.trim().startsWith(text))
  if (!button) throw new Error(`Button starting with "${text}" not found`)
  return button
}

test(
  'profile setup stays on the background step after saving location and transit',
  async () => {
  const user = userEvent.setup()
  const profile: JobseekerProfile = {
    id: 'profile-1',
    app_user_id: 'jobseeker-app-user',
    auth_user_id: 'jobseeker-auth-user',
    full_name: null,
    phone: null,
    address: null,
    city: null,
    zip: null,
    transit_type: null,
    charges: {
      sex_offense: false,
      violent: false,
      armed: false,
      children: false,
      drug: false,
      theft: false,
    },
    profile_complete: false,
    status: 'active',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: null,
  }

  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'jobseeker', profileComplete: false }),
    requestTwaImpl: async (path, init, state) => {
      if (path !== '/api/v1/jobseekers/me') {
        throw new Error(`Unexpected path ${path}`)
      }

      if (!init?.method || init.method === 'GET') {
        return {
          profile: {
            ...profile,
            profile_complete: isProfileComplete(profile),
          },
        }
      }

      if (init.method === 'PATCH') {
        const payload = JSON.parse(String(init.body)) as {
          full_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          zip?: string | null
          transit_type?: JobseekerProfile['transit_type']
          charges?: JobseekerProfile['charges']
        }

        profile.full_name = payload.full_name ?? profile.full_name
        profile.phone = payload.phone ?? profile.phone
        profile.address = payload.address ?? profile.address
        profile.city = payload.city ?? profile.city
        profile.zip = payload.zip ?? profile.zip
        profile.transit_type = payload.transit_type ?? profile.transit_type
        profile.charges = payload.charges ?? profile.charges
        profile.updated_at = '2026-03-26T12:00:00.000Z'
        profile.profile_complete = isProfileComplete(profile)
        state.authMe = buildAuthMe({
          role: 'jobseeker',
          profileComplete: profile.profile_complete,
        })

        return {
          profile: {
            id: profile.id,
            profile_complete: profile.profile_complete,
            updated_at: profile.updated_at,
          },
        }
      }

      throw new Error(`Unexpected method ${init.method}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <JobseekerProfilePage />
      </AuthProvider>
    </MemoryRouter>
  )

  await screen.findByText('Set up your profile')

  await user.click(screen.getByRole('button', { name: 'Next: Personal Info' }))
  await screen.findByText('How should TWA reach you?')

  await user.type(getFieldElement('First name'), 'Sam')
  await user.type(getFieldElement('Last name'), 'Ali')
  await user.type(getFieldElement('Phone number'), '3146003937')
  await user.click(
    screen.getByRole('button', { name: 'Next: Location & Transit' })
  )
  await screen.findByText('Where can you realistically work from?')

  expect(getFieldElement('Address')).toHaveAttribute(
    'autocomplete',
    'street-address'
  )
  expect(getFieldElement('City')).toHaveAttribute(
    'autocomplete',
    'address-level2'
  )
  expect(getFieldElement('ZIP code')).toHaveAttribute(
    'autocomplete',
    'postal-code'
  )
  expect(getFieldElement('ZIP code')).toHaveAttribute('inputmode', 'numeric')

  await user.type(getFieldElement('Address'), ' 2300   OVERLOOK RD APT 410 ')
  await user.type(getFieldElement('City'), ' Cleveland ')
  await user.type(getFieldElement('ZIP code'), '44106 1234')
  await user.click(getButtonByLeadingText('Public Transit'))
  await user.click(screen.getByRole('button', { name: 'Next: Background' }))

  expect(
    await screen.findByText('Private matching information')
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Complete Setup' })
  ).toBeInTheDocument()

  await waitFor(() => {
    expect(
      screen.queryByRole('button', { name: 'Edit Profile' })
    ).not.toBeInTheDocument()
  })

  await waitFor(() => {
    expect(spies.requestTwa).toHaveBeenCalledWith(
      '/api/v1/jobseekers/me',
      expect.any(Object),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          full_name: 'Sam Ali',
          phone: '3146003937',
          address: '2300 OVERLOOK RD APT 410',
          city: 'Cleveland',
          zip: '44106-1234',
          transit_type: 'public_transit',
          charges: {
            sex_offense: false,
            violent: false,
            armed: false,
            children: false,
            drug: false,
            theft: false,
          },
        }),
      })
    )
  })
  },
  10000
)
