import { describe, expect, test } from 'vitest'

import type { AuthAdminSessionFilterRevokeInput } from '../../../types/admin'

import {
  actionConfirmLabel,
  actionHasInlineReason,
  actionSubmittingLabel,
  assertExhaustive,
  buildFilterActionState,
  buildInlineReasonActionState,
  type RevokeActionState,
} from './revokeActionState'

const EMPTY_FILTER: AuthAdminSessionFilterRevokeInput = { is_suspicious: true }

describe('buildInlineReasonActionState', () => {
  test('single-session action carries session id and empty boilerplate', () => {
    const state = buildInlineReasonActionState({
      kind: 'single',
      userId: 'u-1',
      sessionId: 's-1',
      title: 'Verify revoke action',
      description: 'Revoke Chrome on Windows.',
    })

    expect(state).toEqual<RevokeActionState>({
      kind: 'single',
      userId: 'u-1',
      sessionId: 's-1',
      title: 'Verify revoke action',
      description: 'Revoke Chrome on Windows.',
      reason: '',
      otpRequested: false,
      code: '',
      error: null,
      info: null,
      submitting: false,
    })
  })

  test('all-sessions action omits sessionId', () => {
    const state = buildInlineReasonActionState({
      kind: 'all',
      userId: 'u-1',
      title: 'Verify revoke action',
      description: 'Revoke all for u@example.com.',
    })
    expect(state.kind).toBe('all')
    expect('sessionId' in state).toBe(false)
  })

  test('suspicious-sessions action omits sessionId', () => {
    const state = buildInlineReasonActionState({
      kind: 'suspicious',
      userId: 'u-1',
      title: 'Verify revoke action',
      description: 'Revoke suspicious for u@example.com.',
    })
    expect(state.kind).toBe('suspicious')
    expect('sessionId' in state).toBe(false)
  })
})

describe('buildFilterActionState', () => {
  test('preview variant sets kind=filterPreview and carries payload', () => {
    const state = buildFilterActionState({
      kind: 'filterPreview',
      userId: 'u-1',
      title: 'Verify revoke action',
      description: 'Preview matches for u@example.com.',
      payload: { ...EMPTY_FILTER, dry_run: true },
    })
    expect(state.kind).toBe('filterPreview')
    expect(state.payload.dry_run).toBe(true)
    expect(state.otpRequested).toBe(false)
    expect(state.submitting).toBe(false)
  })

  test('execute variant sets kind=filterExecute', () => {
    const state = buildFilterActionState({
      kind: 'filterExecute',
      userId: 'u-1',
      title: 'Verify revoke action',
      description: 'Revoke matches for u@example.com.',
      payload: EMPTY_FILTER,
    })
    expect(state.kind).toBe('filterExecute')
    expect(state.payload.dry_run).toBeUndefined()
  })
})

describe('actionHasInlineReason', () => {
  test('true for single / all / suspicious', () => {
    const single = buildInlineReasonActionState({
      kind: 'single',
      userId: 'u',
      sessionId: 's',
      title: 't',
      description: 'd',
    })
    expect(actionHasInlineReason(single)).toBe(true)

    const all = buildInlineReasonActionState({
      kind: 'all',
      userId: 'u',
      title: 't',
      description: 'd',
    })
    expect(actionHasInlineReason(all)).toBe(true)

    const suspicious = buildInlineReasonActionState({
      kind: 'suspicious',
      userId: 'u',
      title: 't',
      description: 'd',
    })
    expect(actionHasInlineReason(suspicious)).toBe(true)
  })

  test('false for filterPreview / filterExecute', () => {
    const preview = buildFilterActionState({
      kind: 'filterPreview',
      userId: 'u',
      title: 't',
      description: 'd',
      payload: EMPTY_FILTER,
    })
    expect(actionHasInlineReason(preview)).toBe(false)

    const execute = buildFilterActionState({
      kind: 'filterExecute',
      userId: 'u',
      title: 't',
      description: 'd',
      payload: EMPTY_FILTER,
    })
    expect(actionHasInlineReason(execute)).toBe(false)
  })
})

describe('actionConfirmLabel / actionSubmittingLabel', () => {
  const single = buildInlineReasonActionState({
    kind: 'single',
    userId: 'u',
    sessionId: 's',
    title: 't',
    description: 'd',
  })
  const preview = buildFilterActionState({
    kind: 'filterPreview',
    userId: 'u',
    title: 't',
    description: 'd',
    payload: EMPTY_FILTER,
  })
  const execute = buildFilterActionState({
    kind: 'filterExecute',
    userId: 'u',
    title: 't',
    description: 'd',
    payload: EMPTY_FILTER,
  })

  test('confirm label differentiates preview from every destructive kind', () => {
    expect(actionConfirmLabel(preview)).toBe('Confirm preview')
    expect(actionConfirmLabel(single)).toBe('Confirm revoke')
    expect(actionConfirmLabel(execute)).toBe('Confirm revoke')
  })

  test('submitting label differentiates preview from every destructive kind', () => {
    expect(actionSubmittingLabel(preview)).toBe('Previewing...')
    expect(actionSubmittingLabel(single)).toBe('Revoking...')
    expect(actionSubmittingLabel(execute)).toBe('Revoking...')
  })
})

describe('assertExhaustive', () => {
  test('throws at runtime if an unreachable branch is reached', () => {
    expect(() =>
      assertExhaustive('unexpected' as never, 'RevokeActionState.kind')
    ).toThrow('Unhandled RevokeActionState.kind: unexpected')
  })
})
