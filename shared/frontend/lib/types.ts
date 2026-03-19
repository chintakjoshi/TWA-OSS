export type AppRole = 'jobseeker' | 'employer' | 'staff'
export type EmployerReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AppUserPayload {
  id: string
  auth_user_id: string
  email: string
  auth_provider_role: string
  app_role: AppRole | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface AuthMeResponse {
  app_user: AppUserPayload | null
  profile_complete: boolean
  employer_review_status: EmployerReviewStatus | null
  next_step: string | null
}

export interface AuthBootstrapResponse {
  app_user: AppUserPayload
  next_step: string | null
}

export interface EmployerBootstrapProfile {
  org_name: string
  contact_name?: string | null
  phone?: string | null
}

export interface AuthBootstrapRequest {
  role: 'jobseeker' | 'employer'
  employer_profile?: EmployerBootstrapProfile
}

export interface SignupRequest { email: string; password: string }
export interface SignupResponse { user_id: string; email: string; email_verified: boolean }
export interface LoginRequest { email: string; password: string; audience?: string }
export interface TokenPairResponse { access_token: string; refresh_token: string; token_type: 'bearer' }
export interface LoginOTPChallengeResponse { otp_required: true; challenge_token: string; masked_email: string }
export interface ForgotPasswordRequest { email: string }
export interface ForgotPasswordResponse { sent: true }
export interface ResetPasswordRequest { token: string; new_password: string }
export interface ResetPasswordResponse { reset: true }
export interface OTPMessageSentResponse { sent: true }
export interface VerifyLoginOTPRequest { challenge_token: string; code: string }
export interface StoredSession { accessToken: string; refreshToken: string }

export function isOtpChallengeResponse(payload: LoginOTPChallengeResponse | TokenPairResponse): payload is LoginOTPChallengeResponse {
  return 'otp_required' in payload
}

export function isTokenPairResponse(payload: LoginOTPChallengeResponse | TokenPairResponse): payload is TokenPairResponse {
  return 'access_token' in payload && 'refresh_token' in payload
}
