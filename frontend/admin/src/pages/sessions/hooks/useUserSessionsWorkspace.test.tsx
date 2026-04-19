import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminSessionItem,
  AuthAdminUserDetail,
  CursorPageResponse,
} from '../../../types/admin'

import { useUserSessionsWorkspace } from './useUserSessionsWorkspace'

type SessionsResponse = CursorPageResponse<AuthAdminSessionItem>

function buildUserDetail(
  overrides: Partial<AuthAdminUserDetail> = {}
): AuthAdminUserDetail {
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
    active_session_count: 2,
    ...overrides,
  }
}

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

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type RequestAuthMock = ReturnType<typeof vi.fn>

function buildRequestAuth(
  responses: Map<RegExp, () => Promise<unknown>>
): RequestAuthMock {
  return vi.fn(async (path: string) => {
    for (const [pattern, builder] of responses) {
      if (pattern.test(path)) return builder()
    }
    throw new Error(`unmocked path: ${path}`)
  })
}

describe('useUserSessionsWorkspace', () => {
  test('starts idle with no user selected', () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: null })
    )

    expect(result.current.selectedUser).toBeNull()
    expect(result.current.sessions).toEqual([])
    expect(result.current.sessionsLoading).toBe(false)
    expect(requestAuth).not.toHaveBeenCalled()
  })

  test('loads user detail and first sessions page when a user is selected', async () => {
    const user = buildUserDetail({ id: 'u-7', email: 'picked@example.com' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-7$/, async () => user],
        [
          /\/admin\/users\/u-7\/sessions/,
          async () =>
            ({
              data: [buildSession({ session_id: 's-1', user_id: 'u-7' })],
              next_cursor: null,
              has_more: false,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-7' })
    )

    await waitFor(() => {
      expect(result.current.selectedUser?.id).toBe('u-7')
    })
    expect(result.current.sessions.map((s) => s.session_id)).toEqual(['s-1'])
    expect(result.current.sessionsLoading).toBe(false)
  })

  test('clears workspace state when selectedUserId goes null', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-1$/, async () => user],
        [
          /\/admin\/users\/u-1\/sessions/,
          async () =>
            ({
              data: [buildSession()],
              next_cursor: 'cursor-2',
              has_more: true,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useUserSessionsWorkspace({ requestAuth, selectedUserId: id }),
      { initialProps: { id: 'u-1' } }
    )
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    rerender({ id: null })
    expect(result.current.selectedUser).toBeNull()
    expect(result.current.sessions).toEqual([])
    expect(result.current.sessionsCursor).toBeNull()
    expect(result.current.sessionsHasMore).toBe(false)
  })

  test('changing sessionStatus reloads the session list with the new filter', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) return user
      if (path.includes('status=revoked')) {
        return {
          data: [buildSession({ session_id: 's-rev', revoked_at: '2026-04-16T00:00:00Z' })],
          next_cursor: null,
          has_more: false,
        }
      }
      return {
        data: [buildSession({ session_id: 's-act' })],
        next_cursor: null,
        has_more: false,
      }
    })

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessions.map((s) => s.session_id)).toEqual(['s-act'])
    })

    act(() => {
      result.current.setSessionStatus('revoked')
    })
    await waitFor(() => {
      expect(result.current.sessions.map((s) => s.session_id)).toEqual(['s-rev'])
    })
  })

  test('load-more appends a subsequent sessions page', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    let sessionCalls = 0
    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) return user
      sessionCalls += 1
      if (sessionCalls === 1) {
        return {
          data: [buildSession({ session_id: 's-1' })],
          next_cursor: 'cursor-2',
          has_more: true,
        }
      }
      return {
        data: [buildSession({ session_id: 's-2' })],
        next_cursor: null,
        has_more: false,
      }
    })

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessionsCursor).toBe('cursor-2')
    })

    await act(async () => {
      await result.current.loadSessions(result.current.sessionsCursor)
    })
    expect(result.current.sessions.map((s) => s.session_id)).toEqual([
      's-1',
      's-2',
    ])
    expect(result.current.sessionsHasMore).toBe(false)
  })

  test('sessionsError surfaces when the list call fails and clears prior rows', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) return user
      throw new Error('sessions endpoint down')
    })

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessionsError).toBe('sessions endpoint down')
    })
    expect(result.current.sessions).toEqual([])
  })

  test('visibleSessions filters by case-insensitive device/ip/agent/reason match', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-1$/, async () => user],
        [
          /\/admin\/users\/u-1\/sessions/,
          async () =>
            ({
              data: [
                buildSession({
                  session_id: 's-1',
                  device_label: 'Firefox on macOS',
                }),
                buildSession({
                  session_id: 's-2',
                  device_label: 'Chrome on Windows',
                  suspicious_reasons: ['new_ip'],
                }),
              ],
              next_cursor: null,
              has_more: false,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    act(() => {
      result.current.setSessionSearch('NEW_IP')
    })
    expect(result.current.visibleSessions.map((s) => s.session_id)).toEqual([
      's-2',
    ])
  })

  test('suspiciousActiveCount counts non-revoked suspicious sessions', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-1$/, async () => user],
        [
          /\/admin\/users\/u-1\/sessions/,
          async () =>
            ({
              data: [
                buildSession({ session_id: 's-1', is_suspicious: true }),
                buildSession({
                  session_id: 's-2',
                  is_suspicious: true,
                  revoked_at: '2026-04-16T00:00:00Z',
                }),
                buildSession({ session_id: 's-3', is_suspicious: false }),
              ],
              next_cursor: null,
              has_more: false,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.suspiciousActiveCount).toBe(1)
    })
  })

  test('patchRevokedSessions marks the given ids revoked without re-fetching', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-1$/, async () => user],
        [
          /\/admin\/users\/u-1\/sessions/,
          async () =>
            ({
              data: [
                buildSession({ session_id: 's-1' }),
                buildSession({ session_id: 's-2' }),
              ],
              next_cursor: null,
              has_more: false,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    act(() => {
      result.current.patchRevokedSessions(['s-1'], 'compromised')
    })
    expect(requestAuth).toHaveBeenCalledTimes(2) // no extra calls
    const patched = result.current.sessions.find((s) => s.session_id === 's-1')
    expect(patched?.revoked_at).toMatch(/T/)
    expect(patched?.revoke_reason).toBe('compromised')
    const untouched = result.current.sessions.find((s) => s.session_id === 's-2')
    expect(untouched?.revoked_at).toBeNull()
  })

  test('patchRevokedSessions does not overwrite an already-revoked session', async () => {
    const user = buildUserDetail({ id: 'u-1' })
    const requestAuth = buildRequestAuth(
      new Map([
        [/\/admin\/users\/u-1$/, async () => user],
        [
          /\/admin\/users\/u-1\/sessions/,
          async () =>
            ({
              data: [
                buildSession({
                  session_id: 's-1',
                  revoked_at: '2026-04-10T00:00:00Z',
                  revoke_reason: 'original',
                }),
              ],
              next_cursor: null,
              has_more: false,
            }) as SessionsResponse,
        ],
      ])
    )

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })

    act(() => {
      result.current.patchRevokedSessions(['s-1'], 'new-reason')
    })
    expect(result.current.sessions[0].revoked_at).toBe('2026-04-10T00:00:00Z')
    // revoke_reason is overwritten by design (matches existing applyLocalSessionRevocation)
    expect(result.current.sessions[0].revoke_reason).toBe('new-reason')
  })

  test('refresh reloads both user detail and sessions for the current selection', async () => {
    const user1 = buildUserDetail({ id: 'u-1', email: 'v1@example.com' })
    const user2 = buildUserDetail({ id: 'u-1', email: 'v2@example.com' })
    let detailCalls = 0
    let sessionCalls = 0
    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) {
        detailCalls += 1
        return detailCalls === 1 ? user1 : user2
      }
      sessionCalls += 1
      return {
        data: [
          buildSession({
            session_id: sessionCalls === 1 ? 's-1' : 's-2',
          }),
        ],
        next_cursor: null,
        has_more: false,
      }
    })

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.selectedUser?.email).toBe('v1@example.com')
    })

    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.selectedUser?.email).toBe('v2@example.com')
    expect(result.current.sessions.map((s) => s.session_id)).toEqual(['s-2'])
  })

  test('selectedUserError surfaces when the detail call fails', async () => {
    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) {
        throw new Error('detail blew up')
      }
      return { data: [], next_cursor: null, has_more: false }
    })

    const { result } = renderHook(() =>
      useUserSessionsWorkspace({ requestAuth, selectedUserId: 'u-1' })
    )
    await waitFor(() => {
      expect(result.current.selectedUserError).toBe('detail blew up')
    })
    expect(result.current.selectedUser).toBeNull()
  })

  test('ignores stale detail and session responses after switching users', async () => {
    const userOneDetail = createDeferred<AuthAdminUserDetail>()
    const userOneSessions = createDeferred<SessionsResponse>()
    const userTwoDetail = createDeferred<AuthAdminUserDetail>()
    const userTwoSessions = createDeferred<SessionsResponse>()

    const requestAuth = vi.fn(async (path: string) => {
      if (/\/admin\/users\/u-1$/.test(path)) return userOneDetail.promise
      if (/\/admin\/users\/u-1\/sessions/.test(path)) return userOneSessions.promise
      if (/\/admin\/users\/u-2$/.test(path)) return userTwoDetail.promise
      if (/\/admin\/users\/u-2\/sessions/.test(path)) return userTwoSessions.promise
      throw new Error(`unmocked path: ${path}`)
    })

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useUserSessionsWorkspace({ requestAuth, selectedUserId: id }),
      { initialProps: { id: 'u-1' } }
    )

    rerender({ id: 'u-2' })

    await act(async () => {
      userTwoDetail.resolve(
        buildUserDetail({ id: 'u-2', email: 'two@example.com' })
      )
      userTwoSessions.resolve({
        data: [buildSession({ session_id: 's-2', user_id: 'u-2' })],
        next_cursor: null,
        has_more: false,
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.selectedUser?.id).toBe('u-2')
    })
    expect(result.current.sessions.map((session) => session.session_id)).toEqual([
      's-2',
    ])

    await act(async () => {
      userOneDetail.resolve(
        buildUserDetail({ id: 'u-1', email: 'one@example.com' })
      )
      userOneSessions.resolve({
        data: [buildSession({ session_id: 's-1', user_id: 'u-1' })],
        next_cursor: null,
        has_more: false,
      })
      await Promise.resolve()
    })

    expect(result.current.selectedUser?.id).toBe('u-2')
    expect(result.current.sessions.map((session) => session.session_id)).toEqual([
      's-2',
    ])
  })
})
