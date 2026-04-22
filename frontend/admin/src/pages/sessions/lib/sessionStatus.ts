import type {
  AuthAdminSessionItem,
  AuthAdminUserDetail,
  AuthAdminUserListItem,
} from '../../../types/admin'
import { formatStatusLabel } from '../../../lib/formatting'

export type SessionStatusTone = 'success' | 'danger' | 'warning'
export type AccountStatusTone = 'success' | 'warning' | 'danger'

export function sessionStatusTone(
  session: AuthAdminSessionItem
): SessionStatusTone {
  if (session.revoked_at) return 'danger'
  if (new Date(session.expires_at).getTime() <= Date.now()) return 'warning'
  return 'success'
}

export function sessionStatusLabel(session: AuthAdminSessionItem): string {
  if (session.revoked_at) return 'Revoked'
  if (new Date(session.expires_at).getTime() <= Date.now()) return 'Expired'
  return 'Active'
}

export function userRoleTone(role: string): 'info' | 'warning' {
  return role === 'admin' ? 'warning' : 'info'
}

export function accountTone(
  user: AuthAdminUserListItem | AuthAdminUserDetail
): AccountStatusTone {
  if (!user.is_active) return 'danger'
  if (user.locked) return 'warning'
  return 'success'
}

export function accountLabel(
  user: AuthAdminUserListItem | AuthAdminUserDetail
): 'Inactive' | 'Locked' | 'Active' {
  if (!user.is_active) return 'Inactive'
  if (user.locked) return 'Locked'
  return 'Active'
}

export function describeTimelineEvent(eventType: string): string {
  return formatStatusLabel(eventType.replaceAll('.', '_'))
}

export function formatReasonList(reasons: readonly string[]): string {
  if (reasons.length === 0) return 'No risk reasons recorded'
  return reasons.map((reason) => formatStatusLabel(reason)).join(', ')
}

export function formatSessionCount(count: number): string {
  return `${count} session${count === 1 ? '' : 's'}`
}
