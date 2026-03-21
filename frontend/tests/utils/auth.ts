import type { AuthClient } from '@shared/lib/auth-client'
import type {
  AuthBootstrapRequest,
  AuthMeResponse,
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
  TokenPairResponse,
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
  loginError?: Error
  loginResult?: LoginOTPChallengeResponse | TokenPairResponse
  verifyOtpResult?: TokenPairResponse
  fetchAuthMeError?: Error
  onBootstrap?: (
    payload: AuthBootstrapRequest,
    state: MockAuthState
  ) => void | Promise<void>
  requestTwaImpl?: (
    path: string,
    init: RequestInit | undefined,
    state: MockAuthState
  ) => Promise<unknown>
}

const defaultSession: StoredSession = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
}

function unbootstrappedAuthMe(): AuthMeResponse {
  return {
    app_user: null,
    profile_complete: false,
    employer_review_status: null,
    next_step: 'bootstrap_role',
  }
}

export function buildAuthMe({
  role,
  email = `${role}@example.com`,
  profileComplete = role !== 'jobseeker',
  employerReviewStatus = role === 'employer' ? 'approved' : null,
}: {
  role: 'jobseeker' | 'employer' | 'staff'
  email?: string
  profileComplete?: boolean
  employerReviewStatus?: 'pending' | 'approved' | 'rejected' | null
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
    session: options.session ?? (options.authMe ? defaultSession : null),
    authMe: options.authMe ?? null,
    otpChallenge: null,
  }

  const loginResult =
    options.loginResult ??
    ({
      access_token: defaultSession.accessToken,
      refresh_token: defaultSession.refreshToken,
      token_type: 'bearer',
    } satisfies TokenPairResponse)

  const verifyOtpResult =
    options.verifyOtpResult ??
    ({
      access_token: defaultSession.accessToken,
      refresh_token: defaultSession.refreshToken,
      token_type: 'bearer',
    } satisfies TokenPairResponse)

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
    ): Promise<LoginOTPChallengeResponse | TokenPairResponse> => {
      void payload
      if (options.loginError) throw options.loginError
      if ('access_token' in loginResult) {
        state.session = {
          accessToken: loginResult.access_token,
          refreshToken: loginResult.refresh_token,
        }
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
    async (payload: VerifyLoginOTPRequest): Promise<TokenPairResponse> => {
      void payload
      state.session = {
        accessToken: verifyOtpResult.access_token,
        refreshToken: verifyOtpResult.refresh_token,
      }
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
      state.session = defaultSession
      return defaultSession
    }
  )

  const logout = vi.fn(async (session: StoredSession | null): Promise<void> => {
    void session
    state.session = null
    state.authMe = null
    state.otpChallenge = null
  })

  const fetchAuthMe = vi.fn(
    async (session: StoredSession): Promise<AuthMeResponse> => {
      void session
      if (options.fetchAuthMeError) throw options.fetchAuthMeError
      return state.authMe ?? unbootstrappedAuthMe()
    }
  )

  const bootstrapRole = vi.fn(
    async (
      _session: StoredSession,
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
    _session: StoredSession,
    init?: RequestInit
  ): Promise<T> => {
    if (!options.requestTwaImpl) {
      throw new Error(`Unhandled TWA request for ${path}`)
    }
    return (await options.requestTwaImpl(path, init, state)) as T
  }

  const requestTwa = vi.fn(requestTwaImpl)

  const client: AuthClient = {
    loadStoredSession: () => state.session,
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
    },
    defaultSession,
  }
}
