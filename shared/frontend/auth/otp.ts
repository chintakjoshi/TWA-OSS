export const OTP_CODE_LENGTH = 6

export function normalizeOtpCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_CODE_LENGTH)
}

export function isCompleteOtpCode(value: string): boolean {
  return normalizeOtpCode(value).length === OTP_CODE_LENGTH
}
