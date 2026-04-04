import type { AuthMeResponse } from '@shared/lib/types'

export function isEmployerApplicantVisibilityEnabled(
  authMe: AuthMeResponse | null | undefined
): boolean {
  return authMe?.employer_capabilities?.applicant_visibility_enabled ?? false
}
