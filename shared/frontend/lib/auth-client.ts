import { HttpError, joinUrl, requestJson } from './http'
import { createSessionStore } from './session'
import type {
  AuthBootstrapRequest,
  AuthBootstrapResponse,
  AuthMeResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginOTPChallengeResponse,
  LoginRequest,
  OTPMessageSentResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  SignupResponse,
  StoredSession,
  TokenPairResponse,
  VerifyLoginOTPRequest,
} from './types'
import { isOtpChallengeResponse, isTokenPairResponse } from './types'

export interface AuthClientConfig {
  authBaseUrl: string
  twaApiUrl: string
  audience: string
  storageKey: string
}

export interface AuthClient {
  loadStoredSession(): StoredSession | null
  clearStoredSession(): void
  signup(payload: SignupRequest): Promise<SignupResponse>
  login(
    payload: LoginRequest
  ): Promise<LoginOTPChallengeResponse | TokenPairResponse>
  verifyLoginOtp(payload: VerifyLoginOTPRequest): Promise<TokenPairResponse>
  resendLoginOtp(challengeToken: string): Promise<OTPMessageSentResponse>
  requestPasswordReset(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse>
  resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse>
  refresh(refreshToken?: string): Promise<StoredSession>
  logout(session: StoredSession | null): Promise<void>
  fetchAuthMe(session: StoredSession): Promise<AuthMeResponse>
  bootstrapRole(
    session: StoredSession,
    payload: AuthBootstrapRequest
  ): Promise<AuthBootstrapResponse>
  requestTwa<T>(
    path: string,
    session: StoredSession,
    init?: RequestInit
  ): Promise<T>
}

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const store = createSessionStore(config.storageKey)

  async function requestWithBearer<T>(
    baseUrl: string,
    path: string,
    token: string,
    init: RequestInit = {}
  ) {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return requestJson<T>(joinUrl(baseUrl, path), { ...init, headers })
  }

  async function refresh(refreshToken?: string): Promise<StoredSession> {
    const current = refreshToken ?? store.load()?.refreshToken
    if (!current) throw new HttpError(401, 'No refresh token is available.')
    const next = await requestJson<TokenPairResponse>(
      joinUrl(config.authBaseUrl, '/auth/token'),
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: current }),
      }
    )
    const session = {
      accessToken: next.access_token,
      refreshToken: next.refresh_token,
    }
    store.save(session)
    return session
  }

  return {
    loadStoredSession() {
      return store.load()
    },
    clearStoredSession() {
      store.clear()
    },
    signup(payload) {
      return requestJson<SignupResponse>(
        joinUrl(config.authBaseUrl, '/auth/signup'),
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    async login(payload) {
      const result = await requestJson<
        LoginOTPChallengeResponse | TokenPairResponse
      >(joinUrl(config.authBaseUrl, '/auth/login'), {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          audience: payload.audience ?? config.audience,
        }),
      })
      if (isTokenPairResponse(result))
        store.save({
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        })
      return result
    },
    async verifyLoginOtp(payload) {
      const result = await requestJson<TokenPairResponse>(
        joinUrl(config.authBaseUrl, '/auth/otp/verify/login'),
        { method: 'POST', body: JSON.stringify(payload) }
      )
      store.save({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      })
      return result
    },
    resendLoginOtp(challengeToken) {
      return requestJson<OTPMessageSentResponse>(
        joinUrl(config.authBaseUrl, '/auth/otp/resend/login'),
        {
          method: 'POST',
          body: JSON.stringify({ challenge_token: challengeToken }),
        }
      )
    },
    requestPasswordReset(payload) {
      return requestJson<ForgotPasswordResponse>(
        joinUrl(config.authBaseUrl, '/auth/password/forgot'),
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    resetPassword(payload) {
      return requestJson<ResetPasswordResponse>(
        joinUrl(config.authBaseUrl, '/auth/password/reset'),
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    async logout(session) {
      if (!session) {
        store.clear()
        return
      }
      await requestWithBearer<void>(
        config.authBaseUrl,
        '/auth/logout',
        session.accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: session.refreshToken }),
        }
      ).catch(() => undefined)
      store.clear()
    },
    fetchAuthMe(session) {
      return requestWithBearer<AuthMeResponse>(
        config.twaApiUrl,
        '/api/v1/auth/me',
        session.accessToken
      )
    },
    bootstrapRole(session, payload) {
      return requestWithBearer<AuthBootstrapResponse>(
        config.twaApiUrl,
        '/api/v1/auth/bootstrap',
        session.accessToken,
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    async requestTwa<T>(
      path: string,
      session: StoredSession,
      init: RequestInit = {}
    ) {
      try {
        return await requestWithBearer<T>(
          config.twaApiUrl,
          path,
          session.accessToken,
          init
        )
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          const nextSession = await refresh(session.refreshToken)
          return requestWithBearer<T>(
            config.twaApiUrl,
            path,
            nextSession.accessToken,
            init
          )
        }
        throw error
      }
    },
    refresh,
  }
}

export function getAuthStateLabel(response: AuthMeResponse | null): string {
  if (!response) return 'signed_out'
  if (!response.app_user) return 'needs_bootstrap'
  if (response.app_user.app_role === 'employer')
    return response.employer_review_status ?? 'employer_ready'
  if (response.app_user.app_role === 'jobseeker')
    return response.profile_complete ? 'profile_ready' : 'profile_incomplete'
  return 'staff_ready'
}

export function hasOtpChallenge(
  result: LoginOTPChallengeResponse | TokenPairResponse
): result is LoginOTPChallengeResponse {
  return isOtpChallengeResponse(result)
}
