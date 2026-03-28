import { createAuthClient } from '@shared/lib/auth-client'

const twaApiUrl = import.meta.env.VITE_TWA_API_URL ?? 'http://localhost:9000'
const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL?.trim() || '/_auth'
const twaAudience = import.meta.env.VITE_TWA_AUTH_AUDIENCE ?? 'twa-api'

export const jobseekerAuthClient = createAuthClient({
  authBaseUrl,
  twaApiUrl,
  audience: twaAudience,
  storageKey: 'twa-jobseeker-session',
})

export const employerAppUrl =
  import.meta.env.VITE_EMPLOYER_APP_URL ?? 'http://localhost:5174'
