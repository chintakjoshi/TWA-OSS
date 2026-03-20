import { createAuthClient } from '@shared/lib/auth-client'

const twaApiUrl = import.meta.env.VITE_TWA_API_URL ?? 'http://localhost:9000'
const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL?.trim() || '/_auth'
const twaAudience = import.meta.env.VITE_TWA_AUTH_AUDIENCE ?? 'twa-api'

export const employerAuthClient = createAuthClient({
  authBaseUrl,
  twaApiUrl,
  audience: twaAudience,
  storageKey: 'twa-employer-session',
})

export const publicAppUrl =
  import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173'
