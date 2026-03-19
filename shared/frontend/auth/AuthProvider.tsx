import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { hasOtpChallenge, type AuthClient } from '../lib/auth-client'
import type {
  AuthBootstrapRequest,
  AuthMeResponse,
  ForgotPasswordRequest,
  LoginOTPChallengeResponse,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  StoredSession,
  VerifyLoginOTPRequest,
} from '../lib/types'

interface AuthContextValue {
  state: 'loading' | 'anonymous' | 'otp_required' | 'authenticated'
  session: StoredSession | null
  authMe: AuthMeResponse | null
  otpChallenge: LoginOTPChallengeResponse | null
  reload: () => Promise<void>
  signup: (payload: SignupRequest) => Promise<void>
  login: (payload: LoginRequest) => Promise<void>
  verifyLoginOtp: (payload: VerifyLoginOTPRequest) => Promise<void>
  resendLoginOtp: () => Promise<void>
  requestPasswordReset: (payload: ForgotPasswordRequest) => Promise<void>
  resetPassword: (payload: ResetPasswordRequest) => Promise<void>
  bootstrapRole: (payload: AuthBootstrapRequest) => Promise<void>
  logout: () => Promise<void>
  requestTwa: <T>(path: string, init?: RequestInit) => Promise<T>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue['state']>('loading')
  const [session, setSession] = useState<StoredSession | null>(() => client.loadStoredSession())
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null)
  const [otpChallenge, setOtpChallenge] = useState<LoginOTPChallengeResponse | null>(null)

  async function hydrate(sessionOverride?: StoredSession | null) {
    const activeSession = sessionOverride ?? client.loadStoredSession()
    if (!activeSession) {
      setSession(null)
      setAuthMe(null)
      setOtpChallenge(null)
      setState('anonymous')
      return
    }
    setState('loading')
    try {
      const nextAuthMe = await client.fetchAuthMe(activeSession)
      setSession(activeSession)
      setAuthMe(nextAuthMe)
      setOtpChallenge(null)
      setState('authenticated')
    } catch {
      try {
        const refreshed = await client.refresh(activeSession.refreshToken)
        const nextAuthMe = await client.fetchAuthMe(refreshed)
        setSession(refreshed)
        setAuthMe(nextAuthMe)
        setOtpChallenge(null)
        setState('authenticated')
      } catch {
        client.clearStoredSession()
        setSession(null)
        setAuthMe(null)
        setOtpChallenge(null)
        setState('anonymous')
      }
    }
  }

  useEffect(() => { void hydrate(session) }, [])

  const value = useMemo<AuthContextValue>(() => ({
    state,
    session,
    authMe,
    otpChallenge,
    async reload() { await hydrate(session) },
    async signup(payload: SignupRequest) { await client.signup(payload) },
    async login(payload: LoginRequest) {
      setState('loading')
      const result = await client.login(payload)
      if (hasOtpChallenge(result)) {
        setOtpChallenge(result)
        setState('otp_required')
        return
      }
      const nextSession = client.loadStoredSession()
      setSession(nextSession)
      await hydrate(nextSession)
    },
    async verifyLoginOtp(payload: VerifyLoginOTPRequest) {
      setState('loading')
      await client.verifyLoginOtp(payload)
      const nextSession = client.loadStoredSession()
      setSession(nextSession)
      await hydrate(nextSession)
    },
    async resendLoginOtp() {
      if (!otpChallenge) return
      await client.resendLoginOtp(otpChallenge.challenge_token)
    },
    async requestPasswordReset(payload: ForgotPasswordRequest) {
      await client.requestPasswordReset(payload)
    },
    async resetPassword(payload: ResetPasswordRequest) {
      await client.resetPassword(payload)
    },
    async bootstrapRole(payload: AuthBootstrapRequest) {
      const activeSession = client.loadStoredSession()
      if (!activeSession) throw new Error('You must sign in before bootstrapping a TWA role.')
      await client.bootstrapRole(activeSession, payload)
      setSession(client.loadStoredSession())
      await hydrate(client.loadStoredSession())
    },
    async logout() {
      await client.logout(client.loadStoredSession())
      setSession(null)
      setAuthMe(null)
      setOtpChallenge(null)
      setState('anonymous')
    },
    async requestTwa<T>(path: string, init?: RequestInit) {
      const activeSession = client.loadStoredSession()
      if (!activeSession) throw new Error('You must sign in before making this request.')
      return client.requestTwa<T>(path, activeSession, init)
    },
  }), [authMe, client, otpChallenge, session, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider.')
  return context
}


