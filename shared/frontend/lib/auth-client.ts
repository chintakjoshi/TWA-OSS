import { HttpError, joinUrl, requestJson } from './http'
import { createSessionStore } from './session'
import type {
  AuthBootstrapRequest,
  AuthBootstrapResponse,
  AuthMeResponse,
  CookieSessionResponse,
  CSRFTokenResponse,
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
} from './types'
import { isCookieSessionResponse, isOtpChallengeResponse } from './types'

export interface AuthClientConfig {
  authBaseUrl: string
  twaApiUrl: string
  audience: string
  storageKey: string
  csrfCookieName?: string
  csrfHeaderName?: string
}

export interface AuthClient {
  loadStoredSession(): StoredSession | null
  hasSessionHint(): boolean
  clearStoredSession(): void
  signup(payload: SignupRequest): Promise<SignupResponse>
  requestVerificationEmailResend(
    payload: ResendVerifyEmailRequest
  ): Promise<ResendVerifyEmailResponse>
  login(
    payload: LoginRequest
  ): Promise<LoginOTPChallengeResponse | CookieSessionResponse>
  verifyLoginOtp(payload: VerifyLoginOTPRequest): Promise<CookieSessionResponse>
  resendLoginOtp(challengeToken: string): Promise<OTPMessageSentResponse>
  requestPasswordReset(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse>
  resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse>
  refresh(refreshToken?: string): Promise<StoredSession>
  logout(session: StoredSession | null): Promise<void>
  fetchAuthMe(session: StoredSession | null): Promise<AuthMeResponse>
  bootstrapRole(
    session: StoredSession | null,
    payload: AuthBootstrapRequest
  ): Promise<AuthBootstrapResponse>
  requestTwa<T>(
    path: string,
    session: StoredSession | null,
    init?: RequestInit
  ): Promise<T>
  streamTwa(
    path: string,
    session: StoredSession | null,
    init?: RequestInit
  ): Promise<Response>
}

const COOKIE_SESSION: StoredSession = { sessionTransport: 'cookie' }
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const store = createSessionStore(config.storageKey)
  let csrfTokenCache: string | null = null
  const csrfCookieName = config.csrfCookieName?.trim() || 'twa_auth_csrf'
  const csrfHeaderName = config.csrfHeaderName?.trim() || 'X-CSRF-Token'

  function isUnsafeRequest(init: RequestInit = {}): boolean {
    const method = (init.method ?? 'GET').toUpperCase()
    return !SAFE_HTTP_METHODS.has(method)
  }

  function readCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null

    const prefix = `${name}=`
    const value = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix))

    if (!value) return null
    const parsed = decodeURIComponent(value.slice(prefix.length)).trim()
    return parsed || null
  }

  function readCsrfToken(): string | null {
    const cookieValue = readCookieValue(csrfCookieName)
    if (cookieValue) {
      csrfTokenCache = cookieValue
      return cookieValue
    }
    return csrfTokenCache
  }

  async function ensureCsrfToken(): Promise<string> {
    const existing = readCsrfToken()
    if (existing) return existing

    const payload = await requestJson<CSRFTokenResponse>(
      joinUrl(config.authBaseUrl, '/auth/csrf'),
      {
        credentials: 'include',
      }
    )
    csrfTokenCache = payload.csrf_token
    return payload.csrf_token
  }

  async function buildRequestInit(
    init: RequestInit = {},
    {
      cookieTransport = false,
    }: {
      cookieTransport?: boolean
    } = {}
  ): Promise<RequestInit> {
    const headers = new Headers(init.headers)
    if (cookieTransport) headers.set('X-Auth-Session-Transport', 'cookie')
    if (isUnsafeRequest(init)) {
      headers.set(csrfHeaderName, await ensureCsrfToken())
    }
    return {
      ...init,
      credentials: 'include',
      headers,
    }
  }

  async function requestJsonWithSession<T>(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
    options?: { cookieTransport?: boolean }
  ) {
    return requestJson<T>(
      joinUrl(baseUrl, path),
      await buildRequestInit(init, options)
    )
  }

  async function fetchWithSession(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
    options?: { cookieTransport?: boolean }
  ) {
    return fetch(joinUrl(baseUrl, path), await buildRequestInit(init, options))
  }

  async function throwResponseError(response: Response): Promise<never> {
    const isJson =
      response.headers.get('content-type')?.includes('application/json') ??
      false
    const payload = isJson
      ? ((await response.json()) as {
          detail?: string
          message?: string
          code?: string
          error?: { detail?: string; message?: string; code?: string }
        })
      : undefined
    const errorPayload =
      payload && typeof payload === 'object' && payload.error
        ? payload.error
        : payload
    const message =
      errorPayload?.message ||
      errorPayload?.detail ||
      `Request failed with status ${response.status}`
    throw new HttpError(response.status, message, errorPayload)
  }

  async function refresh(refreshToken?: string): Promise<StoredSession> {
    void refreshToken
    await requestJsonWithSession<CookieSessionResponse>(
      config.authBaseUrl,
      '/auth/token',
      { method: 'POST' },
      { cookieTransport: true }
    )
    store.save(COOKIE_SESSION)
    return store.load() ?? COOKIE_SESSION
  }

  async function requestTwaWithRefresh<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    try {
      const result = await requestJsonWithSession<T>(
        config.twaApiUrl,
        path,
        init
      )
      store.save(COOKIE_SESSION)
      return result
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        await refresh()
        const retried = await requestJsonWithSession<T>(
          config.twaApiUrl,
          path,
          init
        )
        store.save(COOKIE_SESSION)
        return retried
      }
      throw error
    }
  }

  async function streamTwaWithRefresh(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    let response = await fetchWithSession(config.twaApiUrl, path, init)
    if (response.status === 401) {
      await refresh()
      response = await fetchWithSession(config.twaApiUrl, path, init)
    }
    if (!response.ok) {
      await throwResponseError(response)
    }
    store.save(COOKIE_SESSION)
    return response
  }

  return {
    loadStoredSession() {
      return store.load()
    },
    hasSessionHint() {
      return readCookieValue(csrfCookieName) !== null
    },
    clearStoredSession() {
      store.clear()
    },
    signup(payload) {
      return requestJsonWithSession<SignupResponse>(
        config.authBaseUrl,
        '/auth/signup',
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    requestVerificationEmailResend(payload) {
      return requestJsonWithSession<ResendVerifyEmailResponse>(
        config.authBaseUrl,
        '/auth/verify-email/resend/request',
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    async login(payload) {
      const result = await requestJsonWithSession<
        LoginOTPChallengeResponse | CookieSessionResponse
      >(
        config.authBaseUrl,
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            audience: payload.audience ?? config.audience,
          }),
        },
        { cookieTransport: true }
      )
      if (isCookieSessionResponse(result)) {
        store.save(COOKIE_SESSION)
      }
      return result
    },
    async verifyLoginOtp(payload) {
      const result = await requestJsonWithSession<CookieSessionResponse>(
        config.authBaseUrl,
        '/auth/otp/verify/login',
        { method: 'POST', body: JSON.stringify(payload) },
        { cookieTransport: true }
      )
      store.save(COOKIE_SESSION)
      return result
    },
    resendLoginOtp(challengeToken) {
      return requestJsonWithSession<OTPMessageSentResponse>(
        config.authBaseUrl,
        '/auth/otp/resend/login',
        {
          method: 'POST',
          body: JSON.stringify({ challenge_token: challengeToken }),
        }
      )
    },
    requestPasswordReset(payload) {
      return requestJsonWithSession<ForgotPasswordResponse>(
        config.authBaseUrl,
        '/auth/password/forgot',
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    resetPassword(payload) {
      return requestJsonWithSession<ResetPasswordResponse>(
        config.authBaseUrl,
        '/auth/password/reset',
        { method: 'POST', body: JSON.stringify(payload) }
      )
    },
    async logout(session) {
      void session
      await requestJsonWithSession<void>(
        config.authBaseUrl,
        '/auth/logout',
        { method: 'POST' },
        { cookieTransport: true }
      ).catch(() => undefined)
      store.clear()
      csrfTokenCache = null
    },
    async fetchAuthMe(session) {
      void session
      const result = await requestJsonWithSession<AuthMeResponse>(
        config.twaApiUrl,
        '/api/v1/auth/me'
      )
      store.save(COOKIE_SESSION)
      return result
    },
    bootstrapRole(session, payload) {
      void session
      return requestTwaWithRefresh<AuthBootstrapResponse>(
        '/api/v1/auth/bootstrap',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
    },
    requestTwa(path, session, init = {}) {
      void session
      return requestTwaWithRefresh(path, init)
    },
    streamTwa(path, session, init = {}) {
      void session
      return streamTwaWithRefresh(path, init)
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
  result: LoginOTPChallengeResponse | CookieSessionResponse
): result is LoginOTPChallengeResponse {
  return isOtpChallengeResponse(result)
}
