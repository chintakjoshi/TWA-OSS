import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { hasOtpChallenge, type AuthClient } from '../lib/auth-client'
import { HttpError } from '../lib/http'
import type {
  AuthBootstrapRequest,
  AuthMeResponse,
  ForgotPasswordRequest,
  LoginOTPChallengeResponse,
  LoginRequest,
  ResendVerifyEmailRequest,
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
  requestVerificationEmailResend: (
    payload: ResendVerifyEmailRequest
  ) => Promise<void>
  login: (payload: LoginRequest) => Promise<void>
  verifyLoginOtp: (payload: VerifyLoginOTPRequest) => Promise<void>
  resendLoginOtp: () => Promise<void>
  requestPasswordReset: (payload: ForgotPasswordRequest) => Promise<void>
  resetPassword: (payload: ResetPasswordRequest) => Promise<void>
  bootstrapRole: (payload: AuthBootstrapRequest) => Promise<void>
  logout: () => Promise<void>
  requestTwa: <T>(path: string, init?: RequestInit) => Promise<T>
  streamTwa: (path: string, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const PORTAL_ACCESS_DENIED_CODE = 'PORTAL_ACCESS_DENIED'
const GENERIC_LOGIN_FAILURE_MESSAGE = 'Invalid email or password.'

function isPortalAccessDenied(error: unknown): error is HttpError {
  return error instanceof HttpError && error.code === PORTAL_ACCESS_DENIED_CODE
}

export function AuthProvider({
  client,
  children,
}: {
  client: AuthClient
  children: ReactNode
}) {
  const [state, setState] = useState<AuthContextValue['state']>('loading')
  const [session, setSession] = useState<StoredSession | null>(() =>
    client.loadStoredSession()
  )
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null)
  const [otpChallenge, setOtpChallenge] =
    useState<LoginOTPChallengeResponse | null>(null)

  const resetAuthState = useCallback(() => {
    client.clearStoredSession()
    setSession(null)
    setAuthMe(null)
    setOtpChallenge(null)
    setState('anonymous')
  }, [client])

  const finalizeAuthenticatedState = useCallback(
    (nextAuthMe: AuthMeResponse) => {
      setSession(client.loadStoredSession())
      setAuthMe(nextAuthMe)
      setOtpChallenge(null)
      setState('authenticated')
    },
    [client]
  )

  const clearDeniedSession = useCallback(
    async (sessionOverride?: StoredSession | null) => {
      const activeSession = sessionOverride ?? client.loadStoredSession()
      try {
        await client.logout(activeSession)
      } catch {
        client.clearStoredSession()
      } finally {
        resetAuthState()
      }
    },
    [client, resetAuthState]
  )

  const hydrate = useCallback(
    async (
      sessionOverride?: StoredSession | null,
      options: { interactive?: boolean } = {}
    ) => {
      const activeSession = sessionOverride ?? client.loadStoredSession()
      const hasSessionHint = activeSession !== null || client.hasSessionHint()
      if (!hasSessionHint) {
        resetAuthState()
        return
      }
      setState('loading')
      try {
        const nextAuthMe = await client.fetchAuthMe(activeSession)
        finalizeAuthenticatedState(nextAuthMe)
      } catch (initialError) {
        if (isPortalAccessDenied(initialError)) {
          await clearDeniedSession(activeSession)
          if (options.interactive) {
            throw new HttpError(401, GENERIC_LOGIN_FAILURE_MESSAGE, {
              code: 'INVALID_CREDENTIALS',
              detail: GENERIC_LOGIN_FAILURE_MESSAGE,
            })
          }
          return
        }
        try {
          const refreshed = await client.refresh()
          const nextAuthMe = await client.fetchAuthMe(refreshed)
          finalizeAuthenticatedState(nextAuthMe)
        } catch (refreshError) {
          if (isPortalAccessDenied(refreshError)) {
            await clearDeniedSession(client.loadStoredSession())
            if (options.interactive) {
              throw new HttpError(401, GENERIC_LOGIN_FAILURE_MESSAGE, {
                code: 'INVALID_CREDENTIALS',
                detail: GENERIC_LOGIN_FAILURE_MESSAGE,
              })
            }
            return
          }
          resetAuthState()
          if (options.interactive) {
            throw refreshError instanceof Error ? refreshError : initialError
          }
        }
      }
    },
    [clearDeniedSession, client, finalizeAuthenticatedState, resetAuthState]
  )

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      authMe,
      otpChallenge,
      async reload() {
        await hydrate(session)
      },
      async signup(payload: SignupRequest) {
        await client.signup(payload)
      },
      async requestVerificationEmailResend(payload: ResendVerifyEmailRequest) {
        await client.requestVerificationEmailResend(payload)
      },
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
        await hydrate(nextSession, { interactive: true })
      },
      async verifyLoginOtp(payload: VerifyLoginOTPRequest) {
        setState('loading')
        await client.verifyLoginOtp(payload)
        const nextSession = client.loadStoredSession()
        setSession(nextSession)
        await hydrate(nextSession, { interactive: true })
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
        await client.bootstrapRole(client.loadStoredSession(), payload)
        setSession(client.loadStoredSession())
        await hydrate(client.loadStoredSession(), { interactive: true })
      },
      async logout() {
        try {
          await client.logout(client.loadStoredSession())
        } finally {
          resetAuthState()
        }
      },
      async requestTwa<T>(path: string, init?: RequestInit) {
        return client.requestTwa<T>(path, client.loadStoredSession(), init)
      },
      async streamTwa(path: string, init?: RequestInit) {
        return client.streamTwa(path, client.loadStoredSession(), init)
      },
    }),
    [authMe, client, hydrate, otpChallenge, resetAuthState, session, state]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider.')
  return context
}
