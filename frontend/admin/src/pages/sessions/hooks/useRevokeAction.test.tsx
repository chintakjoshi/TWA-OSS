import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminSessionFilteredRevokeResponse,
  AuthAdminSessionRevokeResponse,
  AuthAdminUserSessionsRevokedResponse,
} from '../../../types/admin'
import {
  buildFilterActionState,
  buildInlineReasonActionState,
} from '../lib/revokeActionState'

import { useRevokeAction } from './useRevokeAction'

type RequestAuthMock = ReturnType<typeof vi.fn>

function buildRequestAuth(
  responses: Map<RegExp, (path: string) => Promise<unknown>>
): RequestAuthMock {
  return vi.fn(async (path: string) => {
    for (const [pattern, builder] of responses) {
      if (pattern.test(path)) return builder(path)
    }
    throw new Error(`unmocked path: ${path}`)
  })
}

function sessionResponse(
  overrides: Partial<AuthAdminSessionRevokeResponse> = {}
): AuthAdminSessionRevokeResponse {
  return {
    user_id: 'u-1',
    session_id: 's-1',
    revoke_reason: 'compromised',
    ...overrides,
  }
}

function bulkResponse(
  overrides: Partial<AuthAdminUserSessionsRevokedResponse> = {}
): AuthAdminUserSessionsRevokedResponse {
  return {
    user_id: 'u-1',
    revoked_session_ids: ['s-1', 's-2'],
    revoked_session_count: 2,
    revoke_reason: 'bulk-clean',
    ...overrides,
  }
}

function filteredResponse(
  overrides: Partial<AuthAdminSessionFilteredRevokeResponse> = {}
): AuthAdminSessionFilteredRevokeResponse {
  return {
    user_id: 'u-1',
    matched_session_ids: ['s-1'],
    matched_session_count: 1,
    revoked_session_ids: ['s-1'],
    revoked_session_count: 1,
    revoke_reason: 'filter-sweep',
    ...overrides,
  }
}

describe('useRevokeAction', () => {
  test('starts with no action and ignores OTP/confirm when idle', async () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    expect(result.current.action).toBeNull()

    await act(async () => {
      await result.current.requestOtp()
      await result.current.confirm()
    })
    expect(requestAuth).not.toHaveBeenCalled()
  })

  test('setAction + requestOtp transitions through submitting → otpRequested', async () => {
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/auth\/otp\/request\/action/, async () => ({ delivery: 'email' })],
      ])
    )
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )

    act(() => {
      result.current.setAction(
        buildInlineReasonActionState({
          kind: 'single',
          userId: 'u-1',
          sessionId: 's-1',
          title: 'Verify revoke action',
          description: 'Revoke Chrome',
        })
      )
    })
    expect(result.current.action?.otpRequested).toBe(false)

    await act(async () => {
      await result.current.requestOtp()
    })
    expect(result.current.action?.otpRequested).toBe(true)
    expect(result.current.action?.submitting).toBe(false)
    expect(result.current.action?.info).toMatch(/verification code/i)
  })

  test('requestOtp surfaces API error on the action', async () => {
    const requestAuth = vi.fn().mockRejectedValue(new Error('mailer down'))
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      result.current.setAction(
        buildInlineReasonActionState({
          kind: 'single',
          userId: 'u-1',
          sessionId: 's-1',
          title: 't',
          description: 'd',
        })
      )
    })
    await act(async () => {
      await result.current.requestOtp()
    })
    expect(result.current.action?.error).toBe('mailer down')
    expect(result.current.action?.otpRequested).toBe(false)
  })

  test('confirm blocks when the code field is empty', async () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      result.current.setAction(
        buildInlineReasonActionState({
          kind: 'single',
          userId: 'u-1',
          sessionId: 's-1',
          title: 't',
          description: 'd',
        })
      )
    })
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.action?.error).toMatch(/one-time code/i)
    expect(requestAuth).not.toHaveBeenCalled()
  })

  test('single confirm verifies OTP, calls revoke endpoint, clears action, and fires onSingleRevoked', async () => {
    const response = sessionResponse({ session_id: 's-42' })
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [
          /\/auth\/otp\/verify\/action/,
          async () => ({ action_token: 'tok-1' }),
        ],
        [/\/admin\/users\/u-1\/sessions\/s-42$/, async () => response],
      ])
    )
    const onSingleRevoked = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: { onSingleRevoked } })
    )

    act(() => {
      const state = buildInlineReasonActionState({
        kind: 'single',
        userId: 'u-1',
        sessionId: 's-42',
        title: 't',
        description: 'd',
      })
      result.current.setAction({
        ...state,
        otpRequested: true,
        code: '123456',
        reason: 'compromised',
      })
    })
    await act(async () => {
      await result.current.confirm()
    })

    expect(requestAuth).toHaveBeenCalledTimes(2)
    expect(onSingleRevoked).toHaveBeenCalledWith(response, {
      userId: 'u-1',
      reason: 'compromised',
    })
    expect(result.current.action).toBeNull()
  })

  test('all confirm uses reason from action and fires onAllRevoked with bulk response', async () => {
    const response = bulkResponse({ revoked_session_count: 3 })
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [
          /\/auth\/otp\/verify\/action/,
          async () => ({ action_token: 'tok-a' }),
        ],
        [/\/admin\/users\/u-1\/sessions$/, async () => response],
      ])
    )
    const onAllRevoked = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: { onAllRevoked } })
    )
    act(() => {
      const state = buildInlineReasonActionState({
        kind: 'all',
        userId: 'u-1',
        title: 't',
        description: 'd',
      })
      result.current.setAction({
        ...state,
        otpRequested: true,
        code: '222222',
        reason: '  logout-all  ',
      })
    })

    await act(async () => {
      await result.current.confirm()
    })
    expect(onAllRevoked).toHaveBeenCalledWith(response, {
      userId: 'u-1',
      reason: 'logout-all',
    })
    expect(result.current.action).toBeNull()
  })

  test('suspicious confirm hits the filter endpoint and fires onSuspiciousRevoked', async () => {
    const response = filteredResponse({
      revoked_session_ids: ['s-a', 's-b'],
      revoked_session_count: 2,
    })
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [
          /\/auth\/otp\/verify\/action/,
          async () => ({ action_token: 'tok-s' }),
        ],
        [/\/revoke-by-filter$/, async () => response],
      ])
    )
    const onSuspiciousRevoked = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: { onSuspiciousRevoked } })
    )
    act(() => {
      const state = buildInlineReasonActionState({
        kind: 'suspicious',
        userId: 'u-1',
        title: 't',
        description: 'd',
      })
      result.current.setAction({
        ...state,
        otpRequested: true,
        code: '333333',
        reason: '',
      })
    })

    await act(async () => {
      await result.current.confirm()
    })
    expect(onSuspiciousRevoked).toHaveBeenCalledTimes(1)
    expect(onSuspiciousRevoked.mock.calls[0][0]).toBe(response)
    expect(result.current.action).toBeNull()
  })

  test('filterPreview confirm fires onFilterPreviewed and does not clear filter draft', async () => {
    const response = filteredResponse({ matched_session_count: 5 })
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [
          /\/auth\/otp\/verify\/action/,
          async () => ({ action_token: 'tok-p' }),
        ],
        [/\/revoke-by-filter$/, async () => response],
      ])
    )
    const onFilterPreviewed = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: { onFilterPreviewed } })
    )
    act(() => {
      const state = buildFilterActionState({
        kind: 'filterPreview',
        userId: 'u-1',
        title: 't',
        description: 'd',
        payload: { is_suspicious: true, dry_run: true },
      })
      result.current.setAction({
        ...state,
        otpRequested: true,
        code: '444444',
      })
    })
    await act(async () => {
      await result.current.confirm()
    })
    expect(onFilterPreviewed).toHaveBeenCalledWith(response)
    expect(result.current.action).toBeNull()
  })

  test('filterExecute confirm fires onFilterExecuted', async () => {
    const response = filteredResponse({ revoked_session_count: 7 })
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [
          /\/auth\/otp\/verify\/action/,
          async () => ({ action_token: 'tok-e' }),
        ],
        [/\/revoke-by-filter$/, async () => response],
      ])
    )
    const onFilterExecuted = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: { onFilterExecuted } })
    )
    act(() => {
      const state = buildFilterActionState({
        kind: 'filterExecute',
        userId: 'u-1',
        title: 't',
        description: 'd',
        payload: { is_suspicious: true },
      })
      result.current.setAction({
        ...state,
        otpRequested: true,
        code: '555555',
      })
    })
    await act(async () => {
      await result.current.confirm()
    })
    expect(onFilterExecuted).toHaveBeenCalledWith(response, {
      userId: 'u-1',
      reason: undefined,
    })
  })

  test('confirm preserves the action and surfaces an error when the API fails', async () => {
    const requestAuth = buildRequestAuth(
      new Map<RegExp, (path: string) => Promise<unknown>>([
        [/\/auth\/otp\/verify\/action/, async () => ({ action_token: 'tok' })],
        [
          /\/sessions\/s-1$/,
          async () => {
            throw new Error('revoke denied')
          },
        ],
      ])
    )
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      const state = buildInlineReasonActionState({
        kind: 'single',
        userId: 'u-1',
        sessionId: 's-1',
        title: 't',
        description: 'd',
      })
      result.current.setAction({ ...state, otpRequested: true, code: '666666' })
    })
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.action).not.toBeNull()
    expect(result.current.action?.error).toBe('revoke denied')
    expect(result.current.action?.submitting).toBe(false)
  })

  test('clear() nulls the action immediately', () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      result.current.setAction(
        buildInlineReasonActionState({
          kind: 'single',
          userId: 'u-1',
          sessionId: 's-1',
          title: 't',
          description: 'd',
        })
      )
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.action).toBeNull()
  })

  test('updateAction lets callers patch code/reason fields without losing kind', () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      result.current.setAction(
        buildInlineReasonActionState({
          kind: 'single',
          userId: 'u-1',
          sessionId: 's-1',
          title: 't',
          description: 'd',
        })
      )
    })
    act(() => {
      result.current.updateAction({ code: '999999' })
    })
    expect(result.current.action?.code).toBe('999999')
    expect(result.current.action?.kind).toBe('single')
  })

  test('setAction(null) is ignored for updateAction', async () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useRevokeAction({ requestAuth, handlers: {} })
    )
    act(() => {
      result.current.updateAction({ code: '000000' })
    })
    await waitFor(() => {
      expect(result.current.action).toBeNull()
    })
  })
})
