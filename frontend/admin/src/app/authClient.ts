import { createAuthClient } from '@shared/lib/auth-client'

const twaApiUrl = import.meta.env.VITE_TWA_API_URL ?? 'http://localhost:9000'
const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL?.trim() || '/_auth'
const twaAudience = import.meta.env.VITE_TWA_AUTH_AUDIENCE ?? 'twa-api'

export const adminAuthClient = createAuthClient({
  authBaseUrl,
  twaApiUrl,
  audience: twaAudience,
  storageKey: 'twa-admin-session',
})

export const publicAppUrl =
  import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173'
