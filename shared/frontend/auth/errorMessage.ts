import { HttpError } from '../lib/http'

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === 'invalid_otp') {
      return 'Invalid OTP. Please try again.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
