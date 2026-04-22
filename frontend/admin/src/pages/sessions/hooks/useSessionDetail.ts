import { useCallback, useEffect, useRef, useState } from 'react'

import { getAuthUserSessionDetail } from '../../../api/adminApi'
import type { AuthAdminSessionDetail } from '../../../types/admin'

type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

export type UseSessionDetailOptions = {
  requestAuth: RequestAuth
  selectedUserId: string | null
}

export type UseSessionDetailReturn = {
  detail: AuthAdminSessionDetail | null
  loading: boolean
  error: string | null
  open: boolean
  inspect: (userId: string, sessionId: string) => Promise<void>
  close: () => void
  patchRevokedSession: (
    sessionIds: readonly string[],
    revokeReason: string
  ) => void
}

export function useSessionDetail({
  requestAuth,
  selectedUserId,
}: UseSessionDetailOptions): UseSessionDetailReturn {
  const [detail, setDetail] = useState<AuthAdminSessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const inspectRequestIdRef = useRef(0)

  useEffect(() => {
    inspectRequestIdRef.current += 1
    setOpen(false)
    setDetail(null)
    setLoading(false)
    setError(null)
  }, [selectedUserId])

  const inspect = useCallback(
    async (userId: string, sessionId: string) => {
      const requestId = inspectRequestIdRef.current + 1
      inspectRequestIdRef.current = requestId
      setOpen(true)
      setLoading(true)
      setError(null)
      try {
        const response = await getAuthUserSessionDetail(
          requestAuth,
          userId,
          sessionId
        )
        if (inspectRequestIdRef.current !== requestId) return
        setDetail(response)
      } catch (caught) {
        if (inspectRequestIdRef.current !== requestId) return
        setDetail(null)
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load that session detail right now.'
        )
      } finally {
        if (inspectRequestIdRef.current === requestId) {
          setLoading(false)
        }
      }
    },
    [requestAuth]
  )

  const close = useCallback(() => {
    inspectRequestIdRef.current += 1
    setOpen(false)
    setLoading(false)
    setError(null)
  }, [])

  const patchRevokedSession = useCallback(
    (sessionIds: readonly string[], revokeReason: string) => {
      if (sessionIds.length === 0) return
      const revokedIds = new Set(sessionIds)
      const revokedAt = new Date().toISOString()
      setDetail((current) =>
        current && revokedIds.has(current.session_id)
          ? {
              ...current,
              revoked_at: current.revoked_at ?? revokedAt,
              revoke_reason: revokeReason,
            }
          : current
      )
    },
    []
  )

  return { detail, loading, error, open, inspect, close, patchRevokedSession }
}
