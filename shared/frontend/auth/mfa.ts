import { HttpError } from '../lib/http'
import { getAuthErrorMessage } from './errorMessage'

export const MFA_TITLE = 'Multi-factor authentication'
export const MFA_TOGGLE_ARIA_LABEL = 'Multi-factor authentication'
export const MFA_OTP_CODE_ARIA_LABEL = 'OTP code'
export const MFA_ENABLE_CONFIRM_TITLE = 'Enable multi-factor authentication?'
export const MFA_ENABLE_CONFIRM_BODY =
  'Are you sure you want to enable multi-factor authentication? Enabling this will require an OTP code during login.'
export const MFA_DISABLE_CONFIRM_TITLE = 'Disable multi-factor authentication?'
export const MFA_DISABLE_CONFIRM_BODY =
  'Are you sure you want to disable multi-factor authentication? Disabling it will stop OTP verification during login.'
export const MFA_DISABLE_OTP_MODAL_TITLE =
  'Turn off multi-factor authentication'
export const MFA_DISABLE_OTP_PROMPT =
  'Enter the 6-digit OTP code sent to your email to turn MFA off.'
export const MFA_TOGGLE_DESCRIPTION =
  'Require a one-time password from your email inbox whenever this account signs in.'
export const MFA_CARD_DESCRIPTION =
  'Turning MFA on will require an OTP code during login. Turning it off requires a fresh OTP verification first.'
export const MFA_ENABLE_SUCCESS = 'Multi-factor authentication is now enabled.'
export const MFA_DISABLE_SUCCESS =
  'Multi-factor authentication is now disabled.'
export const MFA_RESEND_SUCCESS =
  'A fresh OTP code has been sent to your email.'
export const MFA_DISABLE_OTP_REQUIRED =
  'Enter the 6-digit OTP code from your email before turning MFA off.'

export function formatMfaOtpExpiry(expiresIn: number | null): string | null {
  if (!expiresIn || expiresIn <= 0) return null
  const minutes = Math.max(1, Math.round(expiresIn / 60))
  return `The code expires in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
}

export function getMfaErrorMessage(error: unknown): string {
  if (error instanceof HttpError && error.code === 'reauth_required') {
    return 'For security, sign out and sign back in before enabling MFA.'
  }

  const message = getAuthErrorMessage(error)
  return message || 'Unable to update multi-factor authentication right now.'
}

export function getMfaStatusLabel(enabled: boolean): string {
  return enabled ? 'MFA enabled' : 'MFA disabled'
}
