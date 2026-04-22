import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminUserListItem,
  CursorPageResponse,
} from '../../../types/admin'

import {
  buildDefaultUserFilters,
  useAuthUsersDirectory,
} from './useAuthUsersDirectory'

type UsersResponse = CursorPageResponse<AuthAdminUserListItem>

function buildUser(
  overrides: Partial<AuthAdminUserListItem> = {}
): AuthAdminUserListItem {
  return {
    id: 'u-1',
    email: 'first@example.com',
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

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('buildDefaultUserFilters', () => {
  test('returns empty email, empty role, and locked="all"', () => {
    expect(buildDefaultUserFilters()).toEqual({
      email: '',
      role: '',
      locked: 'all',
    })
  })
})

describe('useAuthUsersDirectory', () => {
  test('auto-loads on mount and fires onFirstLoaded once with the first user id', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({
        data: [buildUser({ id: 'u-1' }), buildUser({ id: 'u-2' })],
        next_cursor: null,
        has_more: false,
      })
    const onFirstLoaded = vi.fn<(id: string) => void>()

    const { result } = renderHook(() =>
      useAuthUsersDirectory({ requestAuth, onFirstLoaded })
    )

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.users.map((u) => u.id)).toEqual(['u-1', 'u-2'])
    expect(onFirstLoaded).toHaveBeenCalledTimes(1)
    expect(onFirstLoaded).toHaveBeenCalledWith('u-1')
  })

  test('encodes filters into the API request', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({ data: [], next_cursor: null, has_more: false })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setFilters({
        email: '  admin@example.com  ',
        role: 'admin',
        locked: 'locked',
      })
    })

    await act(async () => {
      await result.current.load()
    })

    expect(requestAuth).toHaveBeenCalledTimes(2)
    const lastPath = requestAuth.mock.calls.at(-1)?.[0] as string
    expect(lastPath).toContain('email=admin%40example.com')
    expect(lastPath).toContain('role=admin')
    expect(lastPath).toContain('locked=true')
    expect(lastPath).toContain('limit=12')
  })

  test('updating draft filters does not refetch until load is called', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({ data: [], next_cursor: null, has_more: false })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(requestAuth).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setFilters({
        email: 'admin@example.com',
        role: 'admin',
        locked: 'locked',
      })
    })

    expect(requestAuth).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.load()
    })

    expect(requestAuth).toHaveBeenCalledTimes(2)
    const lastPath = requestAuth.mock.calls.at(-1)?.[0] as string
    expect(lastPath).toContain('email=admin%40example.com')
    expect(lastPath).toContain('role=admin')
    expect(lastPath).toContain('locked=true')
  })

  test('maps locked="unlocked" to locked=false in the query', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({ data: [], next_cursor: null, has_more: false })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setFilters({ email: '', role: '', locked: 'unlocked' })
    })

    await act(async () => {
      await result.current.load()
    })

    expect(requestAuth).toHaveBeenCalledTimes(2)
    expect(requestAuth.mock.calls.at(-1)?.[0] as string).toContain(
      'locked=false'
    )
  })

  test('omits locked from query when filter is "all"', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({ data: [], next_cursor: null, has_more: false })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    const path = requestAuth.mock.calls[0][0] as string
    expect(path).not.toContain('locked=')
  })

  test('load(cursor) appends subsequent pages', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValueOnce({
        data: [buildUser({ id: 'u-1' })],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [buildUser({ id: 'u-2' })],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.load(result.current.cursor)
    })

    expect(result.current.users.map((u) => u.id)).toEqual(['u-1', 'u-2'])
    expect(result.current.hasMore).toBe(false)
  })

  test('ignores stale directory responses when a newer search finishes first', async () => {
    const initial = createDeferred<UsersResponse>()
    const filtered = createDeferred<UsersResponse>()
    const requestAuth = vi.fn(async (path: string): Promise<UsersResponse> => {
      if (path === '/admin/users?limit=12') return initial.promise
      if (path.includes('email=second%40example.com')) return filtered.promise
      throw new Error(`unmocked path: ${path}`)
    })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))

    expect(result.current.loading).toBe(true)

    act(() => {
      result.current.setFilters({
        email: 'second@example.com',
        role: '',
        locked: 'all',
      })
    })
    expect(requestAuth).toHaveBeenCalledTimes(1)

    let filteredLoad: Promise<void> | undefined
    await act(async () => {
      filteredLoad = result.current.load()
    })
    expect(requestAuth).toHaveBeenCalledTimes(2)

    await act(async () => {
      filtered.resolve({
        data: [buildUser({ id: 'u-2', email: 'second@example.com' })],
        next_cursor: null,
        has_more: false,
      })
      await filteredLoad
    })

    await waitFor(() => {
      expect(result.current.users.map((u) => u.id)).toEqual(['u-2'])
    })

    await act(async () => {
      initial.resolve({
        data: [buildUser({ id: 'u-1', email: 'first@example.com' })],
        next_cursor: null,
        has_more: false,
      })
      await Promise.resolve()
    })

    expect(result.current.users.map((u) => u.id)).toEqual(['u-2'])
    expect(result.current.loading).toBe(false)
  })

  test('onFirstLoaded does not fire again on subsequent refetches or pages', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({
        data: [buildUser({ id: 'u-1' })],
        next_cursor: 'cursor-2',
        has_more: true,
      })
    const onFirstLoaded = vi.fn<(id: string) => void>()

    const { result } = renderHook(() =>
      useAuthUsersDirectory({ requestAuth, onFirstLoaded })
    )
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(onFirstLoaded).toHaveBeenCalledTimes(1)

    // pagination call
    await act(async () => {
      await result.current.load('cursor-2')
    })
    // explicit refetch via setFilters
    act(() => {
      result.current.setFilters({ email: 'q', role: '', locked: 'all' })
    })
    await act(async () => {
      await result.current.load()
    })

    expect(requestAuth).toHaveBeenCalledTimes(3)

    expect(onFirstLoaded).toHaveBeenCalledTimes(1)
  })

  test('surfaces error message and leaves loading off', async () => {
    const requestAuth = vi.fn().mockRejectedValue(new Error('directory down'))

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.users).toEqual([])
    expect(result.current.error).toBe('directory down')
  })

  test('resetFilters restores defaults and triggers a refetch', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<UsersResponse>>()
      .mockResolvedValue({ data: [], next_cursor: null, has_more: false })

    const { result } = renderHook(() => useAuthUsersDirectory({ requestAuth }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setFilters({
        email: 'foo',
        role: 'admin',
        locked: 'locked',
      })
    })
    await act(async () => {
      await result.current.load()
    })
    expect(requestAuth).toHaveBeenCalledTimes(2)

    act(() => {
      result.current.resetFilters()
    })
    await waitFor(() => {
      expect(requestAuth).toHaveBeenCalledTimes(3)
    })
    expect(result.current.filters).toEqual(buildDefaultUserFilters())
  })
})
