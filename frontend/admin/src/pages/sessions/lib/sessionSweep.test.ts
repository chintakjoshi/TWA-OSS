import { describe, expect, test } from 'vitest'

import {
  buildSessionSweepPayload,
  buildDefaultSessionSweepDraft,
  describeSessionSweep,
  parseSweepDateTime,
  type SessionSweepDraft,
} from './sessionSweep'

function draft(overrides: Partial<SessionSweepDraft> = {}): SessionSweepDraft {
  return { ...buildDefaultSessionSweepDraft(), ...overrides }
}

describe('parseSweepDateTime', () => {
  test('treats whitespace-only input as "not provided" with no error', () => {
    expect(parseSweepDateTime('   ', 'Created after')).toEqual({
      value: undefined,
      error: null,
    })
  })

  test('rejects unparseable input with a label-aware error', () => {
    expect(parseSweepDateTime('not-a-date', 'Created after')).toEqual({
      value: undefined,
      error: 'Enter a valid created after timestamp.',
    })
  })

  test('normalizes valid input to ISO-8601 UTC', () => {
    const result = parseSweepDateTime('2026-04-17T09:00', 'Created after')
    expect(result.error).toBeNull()
    expect(result.value).toBe(new Date('2026-04-17T09:00').toISOString())
  })
})

describe('buildSessionSweepPayload', () => {
  test('requires at least one selector', () => {
    expect(buildSessionSweepPayload(draft({ reason: 'cleanup' }))).toEqual({
      payload: null,
      error: 'Choose at least one filter before previewing a sweep.',
    })
  })

  test('propagates parse errors from date fields', () => {
    const result = buildSessionSweepPayload(
      draft({ createdAfter: 'garbage', isSuspiciousOnly: true })
    )
    expect(result.payload).toBeNull()
    expect(result.error).toBe('Enter a valid created after timestamp.')
  })

  test('rejects inverted created_after / created_before', () => {
    const result = buildSessionSweepPayload(
      draft({
        createdAfter: '2026-05-01T00:00',
        createdBefore: '2026-04-01T00:00',
      })
    )
    expect(result.payload).toBeNull()
    expect(result.error).toBe(
      'Created after must be earlier than created before.'
    )
  })

  test('rejects inverted last_seen_after / last_seen_before', () => {
    const result = buildSessionSweepPayload(
      draft({
        lastSeenAfter: '2026-05-01T00:00',
        lastSeenBefore: '2026-04-01T00:00',
      })
    )
    expect(result.payload).toBeNull()
    expect(result.error).toBe(
      'Last seen after must be earlier than last seen before.'
    )
  })

  test('omits empty strings and only serializes is_suspicious when true', () => {
    const result = buildSessionSweepPayload(
      draft({
        isSuspiciousOnly: false,
        ipAddress: '203.0.113.10',
        reason: '   ',
      })
    )
    expect(result.error).toBeNull()
    expect(result.payload).toEqual({ ip_address: '203.0.113.10' })
  })

  test('serializes every provided selector and trims string inputs', () => {
    const result = buildSessionSweepPayload(
      draft({
        isSuspiciousOnly: true,
        createdAfter: '2026-04-01T00:00',
        createdBefore: '2026-05-01T00:00',
        lastSeenAfter: '2026-04-02T00:00',
        lastSeenBefore: '2026-05-02T00:00',
        ipAddress: '  203.0.113.10  ',
        userAgentContains: '  Chrome  ',
        reason: '  risk_sweep  ',
      })
    )
    expect(result.error).toBeNull()
    expect(result.payload).toEqual({
      is_suspicious: true,
      created_after: new Date('2026-04-01T00:00').toISOString(),
      created_before: new Date('2026-05-01T00:00').toISOString(),
      last_seen_after: new Date('2026-04-02T00:00').toISOString(),
      last_seen_before: new Date('2026-05-02T00:00').toISOString(),
      ip_address: '203.0.113.10',
      user_agent_contains: 'Chrome',
      reason: 'risk_sweep',
    })
  })

  test('reason alone does not satisfy the selector requirement', () => {
    const result = buildSessionSweepPayload(draft({ reason: 'cleanup' }))
    expect(result.payload).toBeNull()
    expect(result.error).toBe(
      'Choose at least one filter before previewing a sweep.'
    )
  })
})

describe('describeSessionSweep', () => {
  test('returns "the selected filters" when payload is empty', () => {
    expect(describeSessionSweep({})).toBe('the selected filters')
  })

  test('returns a single segment verbatim', () => {
    expect(describeSessionSweep({ is_suspicious: true })).toBe(
      'suspicious sessions'
    )
  })

  test('joins two segments with "and"', () => {
    expect(
      describeSessionSweep({
        is_suspicious: true,
        ip_address: '203.0.113.10',
      })
    ).toBe('suspicious sessions and IP 203.0.113.10')
  })

  test('uses Oxford-style "A, B and C" for 3+ segments', () => {
    const description = describeSessionSweep({
      is_suspicious: true,
      ip_address: '203.0.113.10',
      user_agent_contains: 'Chrome',
    })
    expect(description).toBe(
      'suspicious sessions, IP 203.0.113.10 and user agent containing "Chrome"'
    )
  })
})
