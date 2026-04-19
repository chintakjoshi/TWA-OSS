import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminSuspiciousSessionItem,
  CursorPageResponse,
} from '../../../types/admin'

import { useSuspiciousQueue } from './useSuspiciousQueue'

type QueueResponse = CursorPageResponse<AuthAdminSuspiciousSessionItem>

function buildQueueItem(
  overrides: Partial<AuthAdminSuspiciousSessionItem> = {}
): AuthAdminSuspiciousSessionItem {
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
    is_suspicious: true,
    suspicious_reasons: ['new_ip'],
    user_email: 'alpha@example.com',
    user_role: 'user',
    ...overrides,
  }
}

describe('useSuspiciousQueue', () => {
  test('starts in the "not loaded" state with no items', () => {
    const requestAuth = vi.fn()
    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    expect(result.current.items).toEqual([])
    expect(result.current.loaded).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(false)
    expect(requestAuth).not.toHaveBeenCalled()
  })

  test('load() fetches the first page and marks loaded', async () => {
    const requestAuth = vi.fn<
      (path: string, init?: RequestInit) => Promise<QueueResponse>
    >().mockResolvedValue({
      data: [buildQueueItem()],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    await act(async () => {
      await result.current.load()
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.loaded).toBe(true)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.error).toBeNull()
  })

  test('load(cursor) appends a subsequent page', async () => {
    const first = buildQueueItem({ session_id: 's-1', user_id: 'u-1' })
    const second = buildQueueItem({ session_id: 's-2', user_id: 'u-2' })

    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValueOnce({
        data: [first],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [second],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    await act(async () => {
      await result.current.load()
    })
    await act(async () => {
      await result.current.load(result.current.cursor)
    })

    expect(result.current.items.map((item) => item.session_id)).toEqual([
      's-1',
      's-2',
    ])
    expect(result.current.hasMore).toBe(false)
  })

  test('initial load error leaves state empty and surfaces the message', async () => {
    const requestAuth = vi
      .fn()
      .mockRejectedValue(new Error('network fried'))

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    await act(async () => {
      await result.current.load()
    })

    expect(result.current.items).toEqual([])
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).toBe('network fried')
  })

  test('load-more error preserves the already-loaded page', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValueOnce({
        data: [buildQueueItem()],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockRejectedValueOnce(new Error('paginator dead'))

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    await act(async () => {
      await result.current.load()
    })
    await act(async () => {
      await result.current.load(result.current.cursor)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.loaded).toBe(true)
    expect(result.current.error).toBe('paginator dead')
  })

  test('stale in-flight response is dropped when a newer request starts', async () => {
    let resolveStale: ((value: QueueResponse) => void) | null = null
    const stalePromise = new Promise<QueueResponse>((resolve) => {
      resolveStale = resolve
    })

    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockReturnValueOnce(stalePromise)
      .mockResolvedValueOnce({
        data: [buildQueueItem({ session_id: 'fresh', user_email: 'fresh@x.io' })],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))

    // Request #1 starts but never resolves yet
    let request1: Promise<void> | undefined
    await act(async () => {
      request1 = result.current.load()
    })

    // Request #2 supersedes it and resolves first
    await act(async () => {
      await result.current.load()
    })
    expect(result.current.items[0].session_id).toBe('fresh')

    // Now #1's stale response arrives — it must be ignored
    await act(async () => {
      resolveStale?.({
        data: [buildQueueItem({ session_id: 'stale' })],
        next_cursor: null,
        has_more: false,
      })
      await request1
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].session_id).toBe('fresh')
  })

  test('filter() narrows visible items without re-fetching', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValue({
        data: [
          buildQueueItem({
            session_id: 's-1',
            user_email: 'alpha@example.com',
          }),
          buildQueueItem({
            session_id: 's-2',
            user_email: 'beta@example.com',
          }),
        ],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))
    await act(async () => {
      await result.current.load()
    })

    act(() => {
      result.current.setSearch('beta')
    })
    await waitFor(() => {
      expect(result.current.visibleItems).toHaveLength(1)
    })
    expect(result.current.visibleItems[0].user_email).toBe('beta@example.com')
    expect(result.current.items).toHaveLength(2)
    expect(requestAuth).toHaveBeenCalledTimes(1)
  })

  test('uniqueUserCount reflects distinct user_ids across items', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValue({
        data: [
          buildQueueItem({ session_id: 's-1', user_id: 'u-1' }),
          buildQueueItem({ session_id: 's-2', user_id: 'u-1' }),
          buildQueueItem({ session_id: 's-3', user_id: 'u-2' }),
        ],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))
    await act(async () => {
      await result.current.load()
    })

    expect(result.current.uniqueUserCount).toBe(2)
  })

  test('dropSessions removes the given ids from the loaded queue', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValue({
        data: [
          buildQueueItem({ session_id: 's-1' }),
          buildQueueItem({ session_id: 's-2' }),
          buildQueueItem({ session_id: 's-3' }),
        ],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))
    await act(async () => {
      await result.current.load()
    })

    act(() => {
      result.current.dropSessions(['s-1', 's-3'])
    })

    expect(result.current.items.map((item) => item.session_id)).toEqual(['s-2'])
  })

  test('dropSessions is a no-op when given an empty id list', async () => {
    const requestAuth = vi
      .fn<(path: string, init?: RequestInit) => Promise<QueueResponse>>()
      .mockResolvedValue({
        data: [buildQueueItem({ session_id: 's-1' })],
        next_cursor: null,
        has_more: false,
      })

    const { result } = renderHook(() => useSuspiciousQueue(requestAuth))
    await act(async () => {
      await result.current.load()
    })
    const previousItems = result.current.items

    act(() => {
      result.current.dropSessions([])
    })
    expect(result.current.items).toBe(previousItems)
  })
})
