import { createAuthClient } from '@shared/lib/auth-client'

const twaApiUrl = import.meta.env.VITE_TWA_API_URL?.trim() || ''
const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL?.trim() || '/_auth'
const twaAudience = import.meta.env.VITE_TWA_AUTH_AUDIENCE ?? 'twa-api'
const csrfCookieName =
  import.meta.env.VITE_AUTH_CSRF_COOKIE_NAME?.trim() || 'twa_auth_csrf'
const csrfHeaderName =
  import.meta.env.VITE_AUTH_CSRF_HEADER_NAME?.trim() || 'X-CSRF-Token'

export const employerAuthClient = createAuthClient({
  authBaseUrl,
  twaApiUrl,
  audience: twaAudience,
  storageKey: 'twa-employer-session',
  csrfCookieName,
  csrfHeaderName,
})

export const jobseekerAppUrl =
  import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173/auth'
