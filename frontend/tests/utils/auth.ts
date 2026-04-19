import type { AuthClient } from '@shared/lib/auth-client'
import { HttpError } from '@shared/lib/http'
import type {
  AppRole,
  AuthBootstrapRequest,
  AuthMeResponse,
  CookieSessionResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginOTPChallengeResponse,
  LoginRequest,
  OTPMessageSentResponse,
  ResendVerifyEmailRequest,
  ResendVerifyEmailResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  SignupResponse,
  StoredSession,
  VerifyLoginOTPRequest,
} from '@shared/lib/types'
import { vi } from 'vitest'

type MockAuthState = {
  session: StoredSession | null
  authMe: AuthMeResponse | null
  otpChallenge: LoginOTPChallengeResponse | null
}

type MockAuthClientOptions = {
  session?: StoredSession | null
  authMe?: AuthMeResponse | null
  portal?: AppRole
  loginError?: Error
  logoutError?: Error
  loginResult?: LoginOTPChallengeResponse | CookieSessionResponse
  verifyOtpResult?: CookieSessionResponse
  fetchAuthMeError?: Error
  onLogin?: (
    payload: LoginRequest,
    state: MockAuthState
  ) => void | Promise<void>
  onBootstrap?: (
    payload: AuthBootstrapRequest,
    state: MockAuthState
  ) => void | Promise<void>
  requestAuthImpl?: (
    path: string,
    init: RequestInit | undefined,
    state: MockAuthState
  ) => Promise<unknown>
  requestTwaImpl?: (
    path: string,
    init: RequestInit | undefined,
    state: MockAuthState
  ) => Promise<unknown>
  streamTwaImpl?: (
    path: string,
    init: RequestInit | undefined,
    state: MockAuthState
  ) => Promise<Response>
}

const defaultSession: StoredSession = {
  sessionTransport: 'cookie',
}

function unbootstrappedAuthMe(): AuthMeResponse {
  return {
    app_user: null,
    profile_complete: false,
    employer_review_status: null,
    employer_capabilities: null,
    next_step: 'bootstrap_role',
  }
}

function isPortalAuthorized(authMe: AuthMeResponse, portal: AppRole): boolean {
  if (!authMe.app_user) {
    return (
      (portal === 'jobseeker' || portal === 'employer') &&
      authMe.next_step === 'bootstrap_role'
    )
  }

  return authMe.app_user.app_role === portal
}

export function buildAuthMe({
  role,
  email = `${role}@example.com`,
  profileComplete = role !== 'jobseeker',
  employerReviewStatus = role === 'employer' ? 'approved' : null,
  applicantVisibilityEnabled = role === 'employer' ? true : null,
}: {
  role: 'jobseeker' | 'employer' | 'staff'
  email?: string
  profileComplete?: boolean
  employerReviewStatus?: 'pending' | 'approved' | 'rejected' | null
  applicantVisibilityEnabled?: boolean | null
}): AuthMeResponse {
  return {
    app_user: {
      id: `${role}-app-user`,
      auth_user_id: `${role}-auth-user`,
      email,
      auth_provider_role: role === 'staff' ? 'admin' : 'user',
      app_role: role,
      is_active: true,
      created_at: null,
      updated_at: null,
    },
    profile_complete: profileComplete,
    employer_review_status: employerReviewStatus,
    employer_capabilities:
      role === 'employer'
        ? {
            applicant_visibility_enabled: applicantVisibilityEnabled ?? false,
          }
        : null,
    next_step:
      role === 'jobseeker' && !profileComplete
        ? 'complete_jobseeker_profile'
        : role === 'employer' && employerReviewStatus !== 'approved'
          ? 'await_staff_approval'
          : null,
  }
}

export function createMockAuthClient(options: MockAuthClientOptions = {}) {
  const state: MockAuthState = {
    session:
      options.session !== undefined
        ? options.session
        : options.authMe
          ? defaultSession
          : null,
    authMe: options.authMe ?? null,
    otpChallenge: null,
  }

  const loginResult =
    options.loginResult ??
    ({
      authenticated: true,
      session_transport: 'cookie',
    } satisfies CookieSessionResponse)

  const verifyOtpResult =
    options.verifyOtpResult ??
    ({
      authenticated: true,
      session_transport: 'cookie',
    } satisfies CookieSessionResponse)

  const signup = vi.fn(
    async (payload: SignupRequest): Promise<SignupResponse> => ({
      user_id: 'signup-user',
      email: payload.email,
      email_verified: false,
    })
  )

  const login = vi.fn(
    async (
      payload: LoginRequest
    ): Promise<LoginOTPChallengeResponse | CookieSessionResponse> => {
      if (options.loginError) throw options.loginError
      await options.onLogin?.(payload, state)
      if ('session_transport' in loginResult) {
        state.session = defaultSession
        state.otpChallenge = null
      } else {
        state.otpChallenge = loginResult
      }
      return loginResult
    }
  )

  const requestVerificationEmailResend = vi.fn(
    async (
      payload: ResendVerifyEmailRequest
    ): Promise<ResendVerifyEmailResponse> => {
      void payload
      return { sent: true }
    }
  )

  const verifyLoginOtp = vi.fn(
    async (payload: VerifyLoginOTPRequest): Promise<CookieSessionResponse> => {
      void payload
      state.session = defaultSession
      state.otpChallenge = null
      return verifyOtpResult
    }
  )

  const resendLoginOtp = vi.fn(
    async (challengeToken: string): Promise<OTPMessageSentResponse> => {
      void challengeToken
      return { sent: true }
    }
  )

  const requestPasswordReset = vi.fn(
    async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
      void payload
      return { sent: true }
    }
  )

  const resetPassword = vi.fn(
    async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
      void payload
      return { reset: true }
    }
  )

  const refresh = vi.fn(
    async (refreshToken?: string): Promise<StoredSession> => {
      void refreshToken
      if (!state.session && !state.authMe) {
        throw new Error('No active session')
      }
      state.session = defaultSession
      return defaultSession
    }
  )

  const logout = vi.fn(async (session: StoredSession | null): Promise<void> => {
    void session
    if (options.logoutError) throw options.logoutError
    state.session = null
    state.authMe = null
    state.otpChallenge = null
  })

  const fetchAuthMe = vi.fn(
    async (session: StoredSession | null): Promise<AuthMeResponse> => {
      void session
      if (options.fetchAuthMeError) throw options.fetchAuthMeError
      if (state.authMe && state.session === null) {
        state.session = defaultSession
      }
      if (state.authMe) {
        if (
          options.portal &&
          !isPortalAuthorized(state.authMe, options.portal)
        ) {
          throw new HttpError(
            403,
            'This account is not authorized for this portal.',
            {
              code: 'PORTAL_ACCESS_DENIED',
              detail: 'This account is not authorized for this portal.',
            }
          )
        }
        return state.authMe
      }
      if (!state.session) throw new Error('No active session')
      return unbootstrappedAuthMe()
    }
  )

  const bootstrapRole = vi.fn(
    async (
      _session: StoredSession | null,
      payload: AuthBootstrapRequest
    ): Promise<{
      app_user: NonNullable<AuthMeResponse['app_user']>
      next_step: string | null
    }> => {
      await options.onBootstrap?.(payload, state)

      if (!state.authMe?.app_user) {
        state.authMe =
          payload.role === 'jobseeker'
            ? buildAuthMe({ role: 'jobseeker', profileComplete: false })
            : buildAuthMe({
                role: 'employer',
                employerReviewStatus: 'pending',
              })
      }

      const appUser = state.authMe?.app_user
      if (!appUser) {
        throw new Error('Mock bootstrapRole must produce a local app user.')
      }

      return {
        app_user: appUser,
        next_step: state.authMe.next_step,
      }
    }
  )

  const requestTwaImpl: AuthClient['requestTwa'] = async <T>(
    path: string,
    _session: StoredSession | null,
    init?: RequestInit
  ): Promise<T> => {
    if (!options.requestTwaImpl) {
      throw new Error(`Unhandled TWA request for ${path}`)
    }
    return (await options.requestTwaImpl(path, init, state)) as T
  }

  const requestAuthImpl: AuthClient['requestAuth'] = async <T>(
    path: string,
    _session: StoredSession | null,
    init?: RequestInit
  ): Promise<T> => {
    if (!options.requestAuthImpl) {
      throw new Error(`Unhandled auth request for ${path}`)
    }
    return (await options.requestAuthImpl(path, init, state)) as T
  }

  const requestTwa = vi.fn(requestTwaImpl)

  const requestAuth = vi.fn(requestAuthImpl)

  const streamTwaImpl: AuthClient['streamTwa'] = async (
    path: string,
    _session: StoredSession | null,
    init?: RequestInit
  ): Promise<Response> => {
    if (options.streamTwaImpl) {
      return options.streamTwaImpl(path, init, state)
    }

    return new Response(
      new ReadableStream<Uint8Array>({
        start() {},
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    )
  }

  const streamTwa = vi.fn(streamTwaImpl)

  const client: AuthClient = {
    loadStoredSession: () => state.session,
    hasSessionHint: () => Boolean(state.session || state.authMe),
    clearStoredSession: () => {
      state.session = null
      state.authMe = null
      state.otpChallenge = null
    },
    signup,
    requestVerificationEmailResend,
    login,
    verifyLoginOtp,
    resendLoginOtp,
    requestPasswordReset,
    resetPassword,
    refresh,
    logout,
    fetchAuthMe,
    bootstrapRole,
    requestTwa: requestTwa as AuthClient['requestTwa'],
    requestAuth: requestAuth as AuthClient['requestAuth'],
    streamTwa: streamTwa as AuthClient['streamTwa'],
  }

  return {
    client,
    state,
    spies: {
      signup,
      requestVerificationEmailResend,
      login,
      verifyLoginOtp,
      resendLoginOtp,
      requestPasswordReset,
      resetPassword,
      refresh,
      logout,
      fetchAuthMe,
      bootstrapRole,
      requestTwa,
      requestAuth,
      streamTwa,
    },
    defaultSession,
  }
}
