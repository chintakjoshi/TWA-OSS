import { useCallback, useEffect, useState } from 'react'

import type {
  AuthAdminSessionFilteredRevokeResponse,
  AuthAdminSessionFilterRevokeInput,
} from '../../../types/admin'
import {
  buildDefaultSessionSweepDraft,
  buildSessionSweepPayload,
  describeSessionSweep,
  type SessionSweepDraft,
} from '../lib/sessionSweep'

export type FilterSweepActionKind = 'preview' | 'execute'

export type FilterSweepActionRequest = {
  kind: 'filterPreview' | 'filterExecute'
  userId: string
  title: string
  description: string
  payload: AuthAdminSessionFilterRevokeInput
}

export type UseFilterSweepOptions = {
  selectedUserId: string | null
  selectedUserEmail: string | null
  onOpenAction: (request: FilterSweepActionRequest) => void
}

export type UseFilterSweepReturn = {
  open: boolean
  draft: SessionSweepDraft
  preview: AuthAdminSessionFilteredRevokeResponse | null
  error: string | null
  canExecute: boolean
  openSweep: () => void
  closeSweep: () => void
  updateDraft: (patch: Partial<SessionSweepDraft>) => void
  setPreview: (
    next: AuthAdminSessionFilteredRevokeResponse | null
  ) => void
  setError: (next: string | null) => void
  requestAction: (kind: FilterSweepActionKind) => void
}

export function useFilterSweep({
  selectedUserId,
  selectedUserEmail,
  onOpenAction,
}: UseFilterSweepOptions): UseFilterSweepReturn {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<SessionSweepDraft>(
    buildDefaultSessionSweepDraft
  )
  const [preview, setPreviewState] =
    useState<AuthAdminSessionFilteredRevokeResponse | null>(null)
  const [error, setErrorState] = useState<string | null>(null)

  useEffect(() => {
    setOpen(false)
    setDraft(buildDefaultSessionSweepDraft())
    setPreviewState(null)
    setErrorState(null)
  }, [selectedUserId])

  const openSweep = useCallback(() => {
    setOpen(true)
    setDraft(buildDefaultSessionSweepDraft())
    setPreviewState(null)
    setErrorState(null)
  }, [])

  const closeSweep = useCallback(() => {
    setOpen(false)
    setDraft(buildDefaultSessionSweepDraft())
    setPreviewState(null)
    setErrorState(null)
  }, [])

  const updateDraft = useCallback((patch: Partial<SessionSweepDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setPreviewState(null)
    setErrorState(null)
  }, [])

  const setPreview = useCallback(
    (next: AuthAdminSessionFilteredRevokeResponse | null) => {
      setPreviewState(next)
    },
    []
  )

  const setError = useCallback((next: string | null) => {
    setErrorState(next)
  }, [])

  const requestAction = useCallback(
    (kind: FilterSweepActionKind) => {
      if (!selectedUserId || !selectedUserEmail) return

      const { payload, error: payloadError } = buildSessionSweepPayload(draft)
      if (payloadError || !payload) {
        setErrorState(
          payloadError ?? 'Unable to build the selected sweep filter.'
        )
        return
      }

      if (kind === 'execute' && !preview) {
        setErrorState(
          'Preview the current filters before executing the revoke sweep.'
        )
        return
      }

      if (kind === 'execute' && preview?.matched_session_count === 0) {
        setErrorState(
          'The last preview matched zero sessions. Adjust the filters before executing the sweep.'
        )
        return
      }

      const filterDescription = describeSessionSweep(payload)
      const description =
        kind === 'preview'
          ? `Preview matches for ${selectedUserEmail} using ${filterDescription}. No sessions will be revoked yet.`
          : `Revoke sessions for ${selectedUserEmail} using ${filterDescription}.`

      setErrorState(null)
      onOpenAction({
        kind: kind === 'preview' ? 'filterPreview' : 'filterExecute',
        userId: selectedUserId,
        title: 'Verify revoke action',
        description,
        payload:
          kind === 'preview' ? { ...payload, dry_run: true } : payload,
      })
    },
    [draft, onOpenAction, preview, selectedUserEmail, selectedUserId]
  )

  const canExecute =
    preview !== null && preview.matched_session_count > 0

  return {
    open,
    draft,
    preview,
    error,
    canExecute,
    openSweep,
    closeSweep,
    updateDraft,
    setPreview,
    setError,
    requestAction,
  }
}
