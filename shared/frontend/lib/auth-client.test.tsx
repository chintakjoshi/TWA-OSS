import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  buildAuthMe,
  createMockAuthClient,
} from '../../../frontend/tests/utils/auth'
import { AuthProvider, useAuth } from '../auth/AuthProvider'
import { createAuthClient } from './auth-client'

function jsonResponse(
  body: unknown,
  init: ResponseInit = {}
): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
  )
}

function AuthStateProbe() {
  const auth = useAuth()

  return (
    <div>
      <p>state:{auth.state}</p>
      <p>email:{auth.authMe?.app_user?.email ?? 'none'}</p>
    </div>
  )
}

function clearCookies() {
  for (const entry of document.cookie.split(';')) {
    const [name] = entry.split('=')
    const trimmed = name?.trim()
    if (!trimmed) continue
    document.cookie = `${trimmed}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}

beforeEach(() => {
  clearCookies()
})

afterEach(() => {
  clearCookies()
  vi.unstubAllGlobals()
})

test('cookie-session login bootstraps csrf, uses credentials include, and does not persist tokens in localStorage', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ csrf_token: 'csrf-bootstrap-token' }))
    .mockResolvedValueOnce(
      jsonResponse({ authenticated: true, session_transport: 'cookie' })
    )
  vi.stubGlobal('fetch', fetchMock)
  const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
  const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

  const client = createAuthClient({
    authBaseUrl: 'http://app.local/_auth',
    twaApiUrl: 'http://app.local',
    audience: 'twa-api',
    storageKey: 'twa-cookie-session-test',
  })

  expect(client.loadStoredSession()).toBeNull()

  await client.login({
    email: 'jobseeker@example.com',
    password: 'Password123!',
  })

  expect(client.loadStoredSession()).toEqual({ sessionTransport: 'cookie' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[0]?.[0]).toBe('http://app.local/_auth/auth/csrf')
  expect(fetchMock.mock.calls[1]?.[0]).toBe('http://app.local/_auth/auth/login')

  const csrfInit = fetchMock.mock.calls[0]?.[1]
  expect(csrfInit?.credentials).toBe('include')

  const loginInit = fetchMock.mock.calls[1]?.[1]
  expect(loginInit?.credentials).toBe('include')
  expect(loginInit?.method).toBe('POST')

  const headers = new Headers(loginInit?.headers)
  expect(headers.get('X-Auth-Session-Transport')).toBe('cookie')
  expect(headers.get('X-CSRF-Token')).toBe('csrf-bootstrap-token')

  expect(getItemSpy).not.toHaveBeenCalled()
  expect(setItemSpy).not.toHaveBeenCalled()
  expect(removeItemSpy).not.toHaveBeenCalled()
})

test('cookie-backed requests refresh through /auth/token without raw refresh tokens in the request body', async () => {
  let apiRequestCount = 0
  let refreshRequestInit: RequestInit | undefined
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url === 'http://app.local/api/v1/jobseekers/me') {
      apiRequestCount += 1
      if (apiRequestCount === 1) {
        return jsonResponse(
          { detail: 'Session expired.', code: 'session_expired' },
          { status: 401 }
        )
      }
      return jsonResponse({ profile: { id: 'jobseeker-1' } })
    }

    if (url === 'http://app.local/_auth/auth/token') {
      refreshRequestInit = init
      return jsonResponse({ authenticated: true, session_transport: 'cookie' })
    }

    if (url === 'http://app.local/_auth/auth/csrf') {
      return jsonResponse({ csrf_token: 'bootstrap-csrf-token' })
    }

    throw new Error(`Unexpected fetch request for ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  const client = createAuthClient({
    authBaseUrl: 'http://app.local/_auth',
    twaApiUrl: 'http://app.local',
    audience: 'twa-api',
    storageKey: 'twa-cookie-refresh-test',
  })

  const result = await client.requestTwa<{ profile: { id: string } }>(
    '/api/v1/jobseekers/me',
    { sessionTransport: 'cookie' }
  )

  expect(result).toEqual({ profile: { id: 'jobseeker-1' } })
  expect(apiRequestCount).toBe(2)
  expect(fetchMock).toHaveBeenCalledTimes(4)

  const refreshInit = refreshRequestInit
  expect(refreshInit?.credentials).toBe('include')
  expect(refreshInit?.method).toBe('POST')
  expect(refreshInit?.body).toBeUndefined()

  const refreshHeaders = new Headers(refreshInit?.headers)
  expect(refreshHeaders.get('X-Auth-Session-Transport')).toBe('cookie')
  expect(refreshHeaders.get('X-CSRF-Token')).toBe('bootstrap-csrf-token')
})

test('auth provider rehydrates authenticated state on reload without a stored token pair', async () => {
  const authMe = buildAuthMe({ role: 'jobseeker', profileComplete: true })
  const { client } = createMockAuthClient({
    session: null,
    authMe,
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AuthStateProbe />
      </AuthProvider>
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(screen.getByText('state:authenticated')).toBeInTheDocument()
  })
  expect(screen.getByText(`email:${authMe.app_user?.email}`)).toBeInTheDocument()
})
