import { useCallback, useEffect, useRef, useState } from 'react'

import { listAuthUsers } from '../../../api/adminApi'
import type { AuthAdminUserListItem } from '../../../types/admin'

type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

const USERS_PAGE_SIZE = 12

export type UserFilterState = {
  email: string
  role: string
  locked: 'all' | 'locked' | 'unlocked' | string
}

export function buildDefaultUserFilters(): UserFilterState {
  return { email: '', role: '', locked: 'all' }
}

function lockedFilterToFlag(value: string): boolean | undefined {
  if (value === 'locked') return true
  if (value === 'unlocked') return false
  return undefined
}

export type UseAuthUsersDirectoryOptions = {
  requestAuth: RequestAuth
  onFirstLoaded?: (firstUserId: string) => void
}

export type UseAuthUsersDirectoryReturn = {
  users: AuthAdminUserListItem[]
  filters: UserFilterState
  cursor: string | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  setFilters: (next: UserFilterState) => void
  resetFilters: () => void
  load: (cursor?: string | null) => Promise<void>
}

export function useAuthUsersDirectory({
  requestAuth,
  onFirstLoaded,
}: UseAuthUsersDirectoryOptions): UseAuthUsersDirectoryReturn {
  const [filters, setFiltersState] = useState<UserFilterState>(
    buildDefaultUserFilters
  )
  const [users, setUsers] = useState<AuthAdminUserListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstLoadFiredRef = useRef(false)
  const requestIdRef = useRef(0)
  const appliedFiltersRef = useRef<UserFilterState>(buildDefaultUserFilters())
  const onFirstLoadedRef = useRef(onFirstLoaded)
  useEffect(() => {
    onFirstLoadedRef.current = onFirstLoaded
  }, [onFirstLoaded])

  const performLoad = useCallback(
    async (activeFilters: UserFilterState, nextCursor?: string | null) => {
      const append = Boolean(nextCursor)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const response = await listAuthUsers(requestAuth, {
          email: activeFilters.email.trim() || undefined,
          role: activeFilters.role || undefined,
          locked: lockedFilterToFlag(activeFilters.locked),
          cursor: nextCursor ?? undefined,
          limit: USERS_PAGE_SIZE,
        })

        if (requestIdRef.current !== requestId) return

        setUsers((current) =>
          append ? [...current, ...response.data] : response.data
        )
        setCursor(response.next_cursor)
        setHasMore(response.has_more)

        if (!append) {
          appliedFiltersRef.current = activeFilters
        }

        if (
          !append &&
          !firstLoadFiredRef.current &&
          response.data.length > 0
        ) {
          firstLoadFiredRef.current = true
          onFirstLoadedRef.current?.(response.data[0].id)
        }
      } catch (caught) {
        if (requestIdRef.current !== requestId) return

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load auth users right now.'
        )
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [requestAuth]
  )

  useEffect(() => {
    void performLoad(appliedFiltersRef.current)
  }, [performLoad])

  const load = useCallback(
    async (nextCursor?: string | null) => {
      const activeFilters = nextCursor ? appliedFiltersRef.current : filters
      await performLoad(activeFilters, nextCursor)
    },
    [filters, performLoad]
  )

  const setFilters = useCallback((next: UserFilterState) => {
    setFiltersState(next)
  }, [])

  const resetFilters = useCallback(() => {
    const defaults = buildDefaultUserFilters()
    setFiltersState(defaults)
    void performLoad(defaults)
  }, [performLoad])

  return {
    users,
    filters,
    cursor,
    hasMore,
    loading,
    loadingMore,
    error,
    setFilters,
    resetFilters,
    load,
  }
}
