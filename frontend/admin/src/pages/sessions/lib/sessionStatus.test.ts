import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminSessionItem,
  AuthAdminUserDetail,
  AuthAdminUserListItem,
} from '../../../types/admin'

import {
  accountLabel,
  accountTone,
  describeTimelineEvent,
  formatReasonList,
  formatSessionCount,
  sessionStatusLabel,
  sessionStatusTone,
  userRoleTone,
} from './sessionStatus'

function buildSession(
  overrides: Partial<AuthAdminSessionItem> = {}
): AuthAdminSessionItem {
  return {
    session_id: 's-1',
    user_id: 'u-1',
    created_at: '2026-04-17T09:00:00Z',
    last_seen_at: '2026-04-17T10:00:00Z',
    expires_at: '2026-04-24T09:00:00Z',
    revoked_at: null,
    revoke_reason: null,
    ip_address: null,
    user_agent: null,
    device_label: 'Chrome on Windows',
    is_suspicious: false,
    suspicious_reasons: [],
    ...overrides,
  }
}

function buildUser(
  overrides: Partial<AuthAdminUserListItem> = {}
): AuthAdminUserListItem {
  return {
    id: 'u-1',
    email: 'user@example.com',
    role: 'user',
    is_active: true,
    email_verified: true,
    email_otp_enabled: false,
    locked: false,
    lock_retry_after: null,
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-17T09:00:00Z',
    ...overrides,
  }
}

describe('sessionStatusTone / sessionStatusLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('revoked session takes precedence over expiry', () => {
    const revokedButExpired = buildSession({
      revoked_at: '2026-04-17T11:00:00Z',
      expires_at: '2026-04-10T00:00:00Z',
    })
    expect(sessionStatusTone(revokedButExpired)).toBe('danger')
    expect(sessionStatusLabel(revokedButExpired)).toBe('Revoked')
  })

  test('session past expiry (not revoked) is warning/Expired', () => {
    const expired = buildSession({ expires_at: '2026-04-17T11:59:59Z' })
    expect(sessionStatusTone(expired)).toBe('warning')
    expect(sessionStatusLabel(expired)).toBe('Expired')
  })

  test('session exactly at expiry counts as expired (inclusive boundary)', () => {
    const atBoundary = buildSession({ expires_at: '2026-04-17T12:00:00Z' })
    expect(sessionStatusTone(atBoundary)).toBe('warning')
    expect(sessionStatusLabel(atBoundary)).toBe('Expired')
  })

  test('active future-dated session is success/Active', () => {
    const active = buildSession()
    expect(sessionStatusTone(active)).toBe('success')
    expect(sessionStatusLabel(active)).toBe('Active')
  })
})

describe('userRoleTone', () => {
  test('admin renders as warning, everything else as info', () => {
    expect(userRoleTone('admin')).toBe('warning')
    expect(userRoleTone('user')).toBe('info')
    expect(userRoleTone('staff')).toBe('info')
    expect(userRoleTone('')).toBe('info')
  })
})

describe('accountTone / accountLabel', () => {
  test('inactive > locked > active precedence', () => {
    const inactive = buildUser({ is_active: false, locked: true })
    expect(accountTone(inactive)).toBe('danger')
    expect(accountLabel(inactive)).toBe('Inactive')

    const locked = buildUser({ is_active: true, locked: true })
    expect(accountTone(locked)).toBe('warning')
    expect(accountLabel(locked)).toBe('Locked')

    const active = buildUser({ is_active: true, locked: false })
    expect(accountTone(active)).toBe('success')
    expect(accountLabel(active)).toBe('Active')
  })

  test('accepts AuthAdminUserDetail shape (structural)', () => {
    const detail = {
      ...buildUser(),
      active_session_count: 3,
    } satisfies AuthAdminUserDetail
    expect(accountTone(detail)).toBe('success')
    expect(accountLabel(detail)).toBe('Active')
  })
})

describe('describeTimelineEvent', () => {
  test('replaces dotted event names with formatted labels', () => {
    expect(describeTimelineEvent('user.login.suspicious')).toBe(
      'User Login Suspicious'
    )
    expect(describeTimelineEvent('session.created')).toBe('Session Created')
  })
})

describe('formatReasonList', () => {
  test('empty array returns the sentinel', () => {
    expect(formatReasonList([])).toBe('No risk reasons recorded')
  })

  test('joins formatted reasons with comma+space', () => {
    expect(formatReasonList(['new_ip', 'prior_failures'])).toBe(
      'New Ip, Prior Failures'
    )
  })
})

describe('formatSessionCount', () => {
  test('pluralizes based on count', () => {
    expect(formatSessionCount(0)).toBe('0 sessions')
    expect(formatSessionCount(1)).toBe('1 session')
    expect(formatSessionCount(2)).toBe('2 sessions')
  })
})
