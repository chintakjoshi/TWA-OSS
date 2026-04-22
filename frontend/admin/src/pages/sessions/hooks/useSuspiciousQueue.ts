import { useCallback, useMemo, useRef, useState } from 'react'

import { listAuthSuspiciousSessions } from '../../../api/adminApi'
import type { AuthAdminSuspiciousSessionItem } from '../../../types/admin'

type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

const QUEUE_PAGE_SIZE = 50

function matchesQueueSearch(
  item: AuthAdminSuspiciousSessionItem,
  query: string
): boolean {
  if (!query) return true
  return [
    item.user_email,
    item.user_role,
    item.device_label,
    item.ip_address ?? '',
    item.user_agent ?? '',
    ...item.suspicious_reasons,
  ].some((value) => value.toLowerCase().includes(query))
}

export type UseSuspiciousQueueReturn = {
  items: AuthAdminSuspiciousSessionItem[]
  visibleItems: AuthAdminSuspiciousSessionItem[]
  cursor: string | null
  hasMore: boolean
  loaded: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  search: string
  setSearch: (value: string) => void
  uniqueUserCount: number
  load: (cursor?: string | null) => Promise<void>
  dropSessions: (sessionIds: readonly string[]) => void
}

export function useSuspiciousQueue(
  requestAuth: RequestAuth
): UseSuspiciousQueueReturn {
  const [items, setItems] = useState<AuthAdminSuspiciousSessionItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const requestIdRef = useRef(0)

  const load = useCallback(
    async (nextCursor?: string | null) => {
      const append = Boolean(nextCursor)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      const hadLoaded = loaded

      setError(null)
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await listAuthSuspiciousSessions(requestAuth, {
          cursor: nextCursor ?? undefined,
          limit: QUEUE_PAGE_SIZE,
        })

        if (requestIdRef.current !== requestId) return

        setItems((current) =>
          append ? [...current, ...response.data] : response.data
        )
        setCursor(response.next_cursor)
        setHasMore(response.has_more)
        setLoaded(true)
      } catch (caught) {
        if (requestIdRef.current !== requestId) return

        if (!append && !hadLoaded) {
          setItems([])
          setCursor(null)
          setHasMore(false)
          setLoaded(false)
        }

        setError(
          caught instanceof Error
            ? caught.message
            : append
              ? 'Unable to load more suspicious sessions right now.'
              : 'Unable to load the suspicious session queue right now.'
        )
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [loaded, requestAuth]
  )

  const dropSessions = useCallback((sessionIds: readonly string[]) => {
    if (sessionIds.length === 0) return
    const ids = new Set(sessionIds)
    setItems((current) => current.filter((item) => !ids.has(item.session_id)))
  }, [])

  const query = search.trim().toLowerCase()
  const visibleItems = useMemo(
    () => items.filter((item) => matchesQueueSearch(item, query)),
    [items, query]
  )

  const uniqueUserCount = useMemo(
    () => new Set(items.map((item) => item.user_id)).size,
    [items]
  )

  return {
    items,
    visibleItems,
    cursor,
    hasMore,
    loaded,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    uniqueUserCount,
    load,
    dropSessions,
  }
}
