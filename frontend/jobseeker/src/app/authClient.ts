import { createAuthClient } from '@shared/lib/auth-client'

const twaApiUrl = import.meta.env.VITE_TWA_API_URL ?? 'http://localhost:9000'
const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL ?? ''
const twaAudience = import.meta.env.VITE_TWA_AUTH_AUDIENCE ?? 'twa-api'

export const jobseekerAuthClient = createAuthClient({
  authBaseUrl,
  twaApiUrl,
  audience: twaAudience,
  storageKey: 'twa-jobseeker-session',
})

export const employerAppUrl =
  import.meta.env.VITE_EMPLOYER_APP_URL ?? 'http://localhost:5174'
export const adminAppUrl =
  import.meta.env.VITE_ADMIN_APP_URL ?? 'http://localhost:5175'
