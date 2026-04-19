import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  AuthAdminSessionFilteredRevokeResponse,
  AuthAdminSessionFilterRevokeInput,
} from '../../../types/admin'

import { useFilterSweep } from './useFilterSweep'

function buildPreview(
  overrides: Partial<AuthAdminSessionFilteredRevokeResponse> = {}
): AuthAdminSessionFilteredRevokeResponse {
  return {
    matched_session_count: 3,
    matched_session_ids: ['s-1', 's-2', 's-3'],
    revoked_session_count: 0,
    revoked_session_ids: [],
    revoke_reason: '',
    ...overrides,
  }
}

describe('useFilterSweep', () => {
  test('starts closed with the default draft and no preview', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'user@example.com',
        onOpenAction,
      })
    )
    expect(result.current.open).toBe(false)
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.draft.isSuspiciousOnly).toBe(false)
    expect(result.current.canExecute).toBe(false)
  })

  test('openSweep opens the panel and resets preview + error', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'user@example.com',
        onOpenAction,
      })
    )

    act(() => {
      result.current.setPreview(buildPreview({ matched_session_count: 5 }))
      result.current.setError('boom')
    })
    expect(result.current.preview).not.toBeNull()
    expect(result.current.error).toBe('boom')

    act(() => {
      result.current.openSweep()
    })
    expect(result.current.open).toBe(true)
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('closeSweep resets the draft, preview, and error', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'user@example.com',
        onOpenAction,
      })
    )

    act(() => {
      result.current.openSweep()
      result.current.updateDraft({ ipAddress: '1.2.3.4' })
      result.current.setPreview(buildPreview())
      result.current.setError('oops')
    })
    expect(result.current.draft.ipAddress).toBe('1.2.3.4')
    expect(result.current.preview).not.toBeNull()

    act(() => {
      result.current.closeSweep()
    })
    expect(result.current.open).toBe(false)
    expect(result.current.draft.ipAddress).toBe('')
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('updateDraft merges patches and clears preview + error', () => {
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'user@example.com',
        onOpenAction: vi.fn(),
      })
    )
    act(() => {
      result.current.setPreview(buildPreview())
      result.current.setError('stale')
    })

    act(() => {
      result.current.updateDraft({ reason: 'cleanup' })
    })
    expect(result.current.draft.reason).toBe('cleanup')
    expect(result.current.preview).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('canExecute is true only once a non-empty preview exists', () => {
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'user@example.com',
        onOpenAction: vi.fn(),
      })
    )
    expect(result.current.canExecute).toBe(false)

    act(() => {
      result.current.setPreview(buildPreview({ matched_session_count: 0 }))
    })
    expect(result.current.canExecute).toBe(false)

    act(() => {
      result.current.setPreview(buildPreview({ matched_session_count: 2 }))
    })
    expect(result.current.canExecute).toBe(true)
  })

  test('requestAction(preview) invokes onOpenAction with a dry-run payload', () => {
    const onOpenAction =
      vi.fn<
        (args: {
          kind: 'filterPreview' | 'filterExecute'
          userId: string
          title: string
          description: string
          payload: AuthAdminSessionFilterRevokeInput
        }) => void
      >()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'owner@example.com',
        onOpenAction,
      })
    )

    act(() => {
      result.current.updateDraft({ isSuspiciousOnly: true })
    })

    act(() => {
      result.current.requestAction('preview')
    })

    expect(onOpenAction).toHaveBeenCalledTimes(1)
    const call = onOpenAction.mock.calls[0][0]
    expect(call.kind).toBe('filterPreview')
    expect(call.userId).toBe('u-1')
    expect(call.payload.is_suspicious).toBe(true)
    expect(call.payload.dry_run).toBe(true)
    expect(call.description).toContain('owner@example.com')
  })

  test('requestAction(execute) requires a prior preview', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'owner@example.com',
        onOpenAction,
      })
    )
    act(() => {
      result.current.updateDraft({ isSuspiciousOnly: true })
    })

    act(() => {
      result.current.requestAction('execute')
    })
    expect(onOpenAction).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/preview/i)
  })

  test('requestAction(execute) blocks when the last preview matched zero sessions', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'owner@example.com',
        onOpenAction,
      })
    )
    act(() => {
      result.current.updateDraft({ isSuspiciousOnly: true })
      result.current.setPreview(buildPreview({ matched_session_count: 0 }))
    })

    act(() => {
      result.current.requestAction('execute')
    })
    expect(onOpenAction).not.toHaveBeenCalled()
    expect(result.current.error).toMatch(/zero/i)
  })

  test('requestAction(execute) opens a non-dry-run action once a preview is present', () => {
    const onOpenAction =
      vi.fn<
        (args: {
          kind: 'filterPreview' | 'filterExecute'
          userId: string
          title: string
          description: string
          payload: AuthAdminSessionFilterRevokeInput
        }) => void
      >()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'owner@example.com',
        onOpenAction,
      })
    )
    act(() => {
      result.current.updateDraft({ isSuspiciousOnly: true })
      result.current.setPreview(buildPreview({ matched_session_count: 3 }))
    })

    act(() => {
      result.current.requestAction('execute')
    })
    expect(onOpenAction).toHaveBeenCalledTimes(1)
    const call = onOpenAction.mock.calls[0][0]
    expect(call.kind).toBe('filterExecute')
    expect(call.payload.dry_run).toBeUndefined()
  })

  test('requestAction sets an error when the draft has no filters selected', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: 'u-1',
        selectedUserEmail: 'owner@example.com',
        onOpenAction,
      })
    )

    act(() => {
      result.current.requestAction('preview')
    })
    expect(onOpenAction).not.toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })

  test('requestAction is a no-op when no user is selected', () => {
    const onOpenAction = vi.fn()
    const { result } = renderHook(() =>
      useFilterSweep({
        selectedUserId: null,
        selectedUserEmail: null,
        onOpenAction,
      })
    )
    act(() => {
      result.current.updateDraft({ isSuspiciousOnly: true })
      result.current.requestAction('preview')
    })
    expect(onOpenAction).not.toHaveBeenCalled()
  })

  test('changing selectedUserId resets the sweep state', () => {
    const onOpenAction = vi.fn()
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useFilterSweep({
          selectedUserId: id,
          selectedUserEmail: 'owner@example.com',
          onOpenAction,
        }),
      { initialProps: { id: 'u-1' as string | null } }
    )

    act(() => {
      result.current.openSweep()
      result.current.updateDraft({ ipAddress: '9.9.9.9' })
      result.current.setPreview(buildPreview())
    })

    rerender({ id: 'u-2' })
    expect(result.current.open).toBe(false)
    expect(result.current.preview).toBeNull()
    expect(result.current.draft.ipAddress).toBe('')
  })
})
