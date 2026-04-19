import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { AuthAdminSessionDetail } from '../../../types/admin'

import { useSessionDetail } from './useSessionDetail'

function buildDetail(
  overrides: Partial<AuthAdminSessionDetail> = {}
): AuthAdminSessionDetail {
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
    timeline: [],
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSessionDetail', () => {
  test('starts closed with no detail', () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    expect(result.current.open).toBe(false)
    expect(result.current.detail).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(requestAuth).not.toHaveBeenCalled()
  })

  test('inspect opens the panel and loads the detail', async () => {
    const detail = buildDetail({ session_id: 's-42', user_id: 'u-1' })
    const requestAuth = vi.fn().mockResolvedValue(detail)

    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )

    await act(async () => {
      await result.current.inspect('u-1', 's-42')
    })

    expect(result.current.open).toBe(true)
    expect(result.current.detail?.session_id).toBe('s-42')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    const calledPath = requestAuth.mock.calls[0][0] as string
    expect(calledPath).toContain('/admin/users/u-1/sessions/s-42')
  })

  test('inspect surfaces the error message and clears any prior detail', async () => {
    const detail = buildDetail({ session_id: 's-1' })
    const requestAuth = vi
      .fn()
      .mockResolvedValueOnce(detail)
      .mockRejectedValueOnce(new Error('timeline unavailable'))

    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })
    expect(result.current.detail?.session_id).toBe('s-1')

    await act(async () => {
      await result.current.inspect('u-1', 's-2')
    })
    expect(result.current.detail).toBeNull()
    expect(result.current.error).toBe('timeline unavailable')
    expect(result.current.open).toBe(true) // still open so the user sees the error
  })

  test('close resets open state and clears the error', async () => {
    const requestAuth = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })
    expect(result.current.open).toBe(true)
    expect(result.current.error).toBe('boom')

    act(() => {
      result.current.close()
    })
    expect(result.current.open).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('changing selectedUserId resets the detail panel', async () => {
    const requestAuth = vi.fn().mockResolvedValue(buildDetail())
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useSessionDetail({ requestAuth, selectedUserId: id }),
      { initialProps: { id: 'u-1' } }
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })
    expect(result.current.open).toBe(true)
    expect(result.current.detail).not.toBeNull()

    rerender({ id: 'u-2' })
    expect(result.current.open).toBe(false)
    expect(result.current.detail).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('patchRevokedSession updates revoke fields only if the open detail matches', async () => {
    const requestAuth = vi
      .fn()
      .mockResolvedValue(buildDetail({ session_id: 's-1' }))
    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })

    act(() => {
      result.current.patchRevokedSession(['s-1', 's-2'], 'compromised')
    })
    expect(result.current.detail?.revoked_at).toMatch(/T/)
    expect(result.current.detail?.revoke_reason).toBe('compromised')
  })

  test('patchRevokedSession is a no-op when the open detail is not in the id list', async () => {
    const original = buildDetail({
      session_id: 's-1',
      revoked_at: null,
      revoke_reason: null,
    })
    const requestAuth = vi.fn().mockResolvedValue(original)
    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })
    const before = result.current.detail

    act(() => {
      result.current.patchRevokedSession(['s-99'], 'whatever')
    })
    expect(result.current.detail).toBe(before)
  })

  test('patchRevokedSession does not overwrite an already-revoked timestamp', async () => {
    const original = buildDetail({
      session_id: 's-1',
      revoked_at: '2026-04-10T00:00:00Z',
      revoke_reason: 'old-reason',
    })
    const requestAuth = vi.fn().mockResolvedValue(original)
    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )
    await act(async () => {
      await result.current.inspect('u-1', 's-1')
    })

    act(() => {
      result.current.patchRevokedSession(['s-1'], 'new-reason')
    })
    expect(result.current.detail?.revoked_at).toBe('2026-04-10T00:00:00Z')
    expect(result.current.detail?.revoke_reason).toBe('new-reason')
  })

  test('loading is true while inspect is in flight', async () => {
    let resolveDetail: ((value: AuthAdminSessionDetail) => void) | null = null
    const pending = new Promise<AuthAdminSessionDetail>((resolve) => {
      resolveDetail = resolve
    })
    const requestAuth = vi.fn().mockReturnValueOnce(pending)

    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )

    let inspecting: Promise<void> | undefined
    await act(async () => {
      inspecting = result.current.inspect('u-1', 's-1')
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.open).toBe(true)

    await act(async () => {
      resolveDetail?.(buildDetail({ session_id: 's-1' }))
      await inspecting
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  test('ignores stale inspect responses when a newer session detail wins', async () => {
    const firstInspect = createDeferred<AuthAdminSessionDetail>()
    const secondInspect = createDeferred<AuthAdminSessionDetail>()
    let inspectCallCount = 0

    const requestAuth = vi.fn(() => {
      inspectCallCount += 1
      return inspectCallCount === 1
        ? firstInspect.promise
        : secondInspect.promise
    })

    const { result } = renderHook(() =>
      useSessionDetail({ requestAuth, selectedUserId: 'u-1' })
    )

    let firstRequest: Promise<void> | undefined
    act(() => {
      firstRequest = result.current.inspect('u-1', 's-1')
    })

    let secondRequest: Promise<void> | undefined
    act(() => {
      secondRequest = result.current.inspect('u-1', 's-2')
    })

    await act(async () => {
      secondInspect.resolve(buildDetail({ session_id: 's-2' }))
      await secondRequest
    })

    expect(result.current.detail?.session_id).toBe('s-2')

    await act(async () => {
      firstInspect.resolve(buildDetail({ session_id: 's-1' }))
      await firstRequest
    })

    expect(result.current.detail?.session_id).toBe('s-2')
    expect(result.current.error).toBeNull()
  })
})
