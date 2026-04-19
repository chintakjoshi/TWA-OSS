import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getAuthUserDetail,
  listAuthUserSessions,
} from '../../../api/adminApi'
import type {
  AuthAdminSessionItem,
  AuthAdminUserDetail,
} from '../../../types/admin'

type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

const SESSIONS_PAGE_SIZE = 50

export type SessionStatusFilter = 'active' | 'revoked' | 'all'

export type UseUserSessionsWorkspaceOptions = {
  requestAuth: RequestAuth
  selectedUserId: string | null
}

export type UseUserSessionsWorkspaceReturn = {
  selectedUser: AuthAdminUserDetail | null
  selectedUserLoading: boolean
  selectedUserError: string | null

  sessions: AuthAdminSessionItem[]
  visibleSessions: AuthAdminSessionItem[]
  sessionsCursor: string | null
  sessionsHasMore: boolean
  sessionsLoading: boolean
  sessionsLoadingMore: boolean
  sessionsError: string | null
  suspiciousActiveCount: number

  sessionStatus: SessionStatusFilter
  setSessionStatus: (value: SessionStatusFilter) => void
  sessionSearch: string
  setSessionSearch: (value: string) => void

  loadSessions: (cursor?: string | null) => Promise<void>
  refresh: () => Promise<void>
  patchRevokedSessions: (sessionIds: readonly string[], revokeReason: string) => void
}

function matchesSessionSearch(
  session: AuthAdminSessionItem,
  query: string
): boolean {
  if (!query) return true
  return [
    session.device_label,
    session.ip_address ?? '',
    session.user_agent ?? '',
    session.revoke_reason ?? '',
    ...session.suspicious_reasons,
  ].some((value) => value.toLowerCase().includes(query))
}

export function useUserSessionsWorkspace({
  requestAuth,
  selectedUserId,
}: UseUserSessionsWorkspaceOptions): UseUserSessionsWorkspaceReturn {
  const [selectedUser, setSelectedUser] = useState<AuthAdminUserDetail | null>(
    null
  )
  const [selectedUserLoading, setSelectedUserLoading] = useState(false)
  const [selectedUserError, setSelectedUserError] = useState<string | null>(null)

  const [sessions, setSessions] = useState<AuthAdminSessionItem[]>([])
  const [sessionsCursor, setSessionsCursor] = useState<string | null>(null)
  const [sessionsHasMore, setSessionsHasMore] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatusFilter>('active')
  const [sessionSearch, setSessionSearch] = useState('')
  const selectedUserRequestIdRef = useRef(0)
  const sessionsRequestIdRef = useRef(0)

  const loadSelectedUser = useCallback(
    async (userId: string) => {
      const requestId = selectedUserRequestIdRef.current + 1
      selectedUserRequestIdRef.current = requestId
      setSelectedUserLoading(true)
      setSelectedUserError(null)
      try {
        const response = await getAuthUserDetail(requestAuth, userId)
        if (selectedUserRequestIdRef.current !== requestId) return
        setSelectedUser(response)
      } catch (caught) {
        if (selectedUserRequestIdRef.current !== requestId) return
        setSelectedUser(null)
        setSelectedUserError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load that auth user right now.'
        )
      } finally {
        if (selectedUserRequestIdRef.current === requestId) {
          setSelectedUserLoading(false)
        }
      }
    },
    [requestAuth]
  )

  const loadSessions = useCallback(
    async (cursor?: string | null) => {
      if (!selectedUserId) return
      const append = Boolean(cursor)
      const requestId = sessionsRequestIdRef.current + 1
      sessionsRequestIdRef.current = requestId
      if (append) {
        setSessionsLoadingMore(true)
      } else {
        setSessionsLoading(true)
      }
      setSessionsError(null)

      try {
        const response = await listAuthUserSessions(
          requestAuth,
          selectedUserId,
          {
            status: sessionStatus,
            cursor: cursor ?? undefined,
            limit: SESSIONS_PAGE_SIZE,
          }
        )
        if (sessionsRequestIdRef.current !== requestId) return
        setSessions((current) =>
          append ? [...current, ...response.data] : response.data
        )
        setSessionsCursor(response.next_cursor)
        setSessionsHasMore(response.has_more)
      } catch (caught) {
        if (sessionsRequestIdRef.current !== requestId) return
        if (!append) {
          setSessions([])
          setSessionsCursor(null)
          setSessionsHasMore(false)
        }
        setSessionsError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load session inventory right now.'
        )
      } finally {
        if (sessionsRequestIdRef.current === requestId) {
          setSessionsLoading(false)
          setSessionsLoadingMore(false)
        }
      }
    },
    [requestAuth, selectedUserId, sessionStatus]
  )

  useEffect(() => {
    if (!selectedUserId) {
      selectedUserRequestIdRef.current += 1
      sessionsRequestIdRef.current += 1
      setSelectedUser(null)
      setSelectedUserLoading(false)
      setSelectedUserError(null)
      setSessions([])
      setSessionsCursor(null)
      setSessionsHasMore(false)
      setSessionsLoading(false)
      setSessionsLoadingMore(false)
      setSessionsError(null)
      return
    }

    void loadSelectedUser(selectedUserId)
    void loadSessions()
  }, [loadSelectedUser, loadSessions, selectedUserId])

  const refresh = useCallback(async () => {
    if (!selectedUserId) return
    await loadSelectedUser(selectedUserId)
    await loadSessions()
  }, [loadSelectedUser, loadSessions, selectedUserId])

  const patchRevokedSessions = useCallback(
    (sessionIds: readonly string[], revokeReason: string) => {
      if (sessionIds.length === 0) return
      const revokedIds = new Set(sessionIds)
      const revokedAt = new Date().toISOString()

      setSessions((current) =>
        current.map((session) =>
          revokedIds.has(session.session_id)
            ? {
                ...session,
                revoked_at: session.revoked_at ?? revokedAt,
                revoke_reason: revokeReason,
              }
            : session
        )
      )
    },
    []
  )

  const query = sessionSearch.trim().toLowerCase()
  const visibleSessions = useMemo(
    () => sessions.filter((session) => matchesSessionSearch(session, query)),
    [sessions, query]
  )
  const suspiciousActiveCount = useMemo(
    () =>
      sessions.filter((session) => !session.revoked_at && session.is_suspicious)
        .length,
    [sessions]
  )

  return {
    selectedUser,
    selectedUserLoading,
    selectedUserError,

    sessions,
    visibleSessions,
    sessionsCursor,
    sessionsHasMore,
    sessionsLoading,
    sessionsLoadingMore,
    sessionsError,
    suspiciousActiveCount,

    sessionStatus,
    setSessionStatus,
    sessionSearch,
    setSessionSearch,

    loadSessions,
    refresh,
    patchRevokedSessions,
  }
}
