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
  OTPEnrollmentResponse,
  OTPMessageSentResponse,
  RequestActionOTPRequest,
  RequestActionOTPResponse,
  ResendVerifyEmailRequest,
  ResendVerifyEmailResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  SignupResponse,
  StoredSession,
  VerifyActionOTPRequest,
  VerifyActionOTPResponse,
  VerifyLoginOTPRequest,
} from '@shared/lib/types'
import { vi } from 'vitest'

type MockAuthState = {
  session: StoredSession | null
  authMe: AuthMeResponse | null
  otpChallenge: LoginOTPChallengeResponse | null
  nextActionToken: string | null
}

type MockAuthClientOptions = {
  session?: StoredSession | null
  authMe?: AuthMeResponse | null
  portal?: AppRole
  loginError?: Error
  logoutError?: Error
  loginResult?: LoginOTPChallengeResponse | CookieSessionResponse
  verifyOtpError?: Error
  verifyOtpResult?: CookieSessionResponse
  requestActionOtpResult?: RequestActionOTPResponse
  verifyActionOtpResult?: VerifyActionOTPResponse
  enableEmailOtpError?: Error
  disableEmailOtpError?: Error
  fetchAuthMeError?: Error
  onLogin?: (
    payload: LoginRequest,
    state: MockAuthState
  ) => void | Promise<void>
  onBootstrap?: (
    payload: AuthBootstrapRequest,
    state: MockAuthState
  ) => void | Promise<void>
  onRequestActionOtp?: (
    payload: RequestActionOTPRequest,
    state: MockAuthState
  ) => void | Promise<void>
  onVerifyActionOtp?: (
    payload: VerifyActionOTPRequest,
    state: MockAuthState
  ) => void | Promise<void>
  onEnableEmailOtp?: (
    actionToken: string | undefined,
    state: MockAuthState
  ) => void | Promise<void>
  onDisableEmailOtp?: (
    actionToken: string | undefined,
    state: MockAuthState
  ) => void | Promise<void>
  requestTwaImpl?: (
    path: string,
    init: RequestInit | undefined,
    state: MockAuthState
  ) => Promise<unknown>
}

const defaultSession: StoredSession = {
  sessionTransport: 'cookie',
}

function unbootstrappedAuthMe(): AuthMeResponse {
  return {
    app_user: null,
    profile_complete: false,
    email_otp_enabled: false,
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
  emailOtpEnabled = false,
  employerReviewStatus = role === 'employer' ? 'approved' : null,
  applicantVisibilityEnabled = role === 'employer' ? true : null,
}: {
  role: 'jobseeker' | 'employer' | 'staff'
  email?: string
  profileComplete?: boolean
  emailOtpEnabled?: boolean
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
    email_otp_enabled: emailOtpEnabled,
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
    nextActionToken: null,
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
  const requestActionOtpResult =
    options.requestActionOtpResult ??
    ({
      sent: true,
      action: 'disable_otp',
      expires_in: 300,
    } satisfies RequestActionOTPResponse)
  const verifyActionOtpResult =
    options.verifyActionOtpResult ??
    ({
      action_token: 'mock-action-token',
    } satisfies VerifyActionOTPResponse)

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
      if (options.verifyOtpError) throw options.verifyOtpError
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

  const requestActionOtp = vi.fn(
    async (
      payload: RequestActionOTPRequest
    ): Promise<RequestActionOTPResponse> => {
      await options.onRequestActionOtp?.(payload, state)
      return {
        ...requestActionOtpResult,
        action: payload.action,
      }
    }
  )

  const verifyActionOtp = vi.fn(
    async (
      payload: VerifyActionOTPRequest
    ): Promise<VerifyActionOTPResponse> => {
      await options.onVerifyActionOtp?.(payload, state)
      state.nextActionToken = verifyActionOtpResult.action_token
      return verifyActionOtpResult
    }
  )

  const enableEmailOtp = vi.fn(
    async (actionToken?: string): Promise<OTPEnrollmentResponse> => {
      if (options.enableEmailOtpError) throw options.enableEmailOtpError
      await options.onEnableEmailOtp?.(actionToken, state)
      if (state.authMe) {
        state.authMe = { ...state.authMe, email_otp_enabled: true }
      }
      return { email_otp_enabled: true }
    }
  )

  const disableEmailOtp = vi.fn(
    async (actionToken?: string): Promise<OTPEnrollmentResponse> => {
      if (options.disableEmailOtpError) throw options.disableEmailOtpError
      await options.onDisableEmailOtp?.(actionToken, state)
      if (state.authMe) {
        state.authMe = { ...state.authMe, email_otp_enabled: false }
      }
      state.nextActionToken = null
      return { email_otp_enabled: false }
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

  const requestTwa = vi.fn(requestTwaImpl)
  const streamTwa = vi.fn(
    async (): Promise<Response> =>
      new Response(new ReadableStream(), {
        headers: { 'Content-Type': 'text/event-stream' },
      })
  )

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
    requestActionOtp,
    verifyActionOtp,
    enableEmailOtp,
    disableEmailOtp,
    requestPasswordReset,
    resetPassword,
    refresh,
    logout,
    fetchAuthMe,
    bootstrapRole,
    requestTwa: requestTwa as AuthClient['requestTwa'],
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
      requestActionOtp,
      verifyActionOtp,
      enableEmailOtp,
      disableEmailOtp,
      requestPasswordReset,
      resetPassword,
      refresh,
      logout,
      fetchAuthMe,
      bootstrapRole,
      requestTwa,
      streamTwa,
    },
    defaultSession,
  }
}
