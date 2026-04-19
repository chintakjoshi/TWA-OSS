import { useCallback, useEffect, useRef, useState } from 'react'

import {
  requestRevokeActionOtp,
  revokeAllAuthUserSessions,
  revokeAuthUserSession,
  revokeAuthUserSessionsByFilter,
  verifyRevokeActionOtp,
} from '../../../api/adminApi'
import type {
  AuthAdminSessionFilteredRevokeResponse,
  AuthAdminSessionRevokeResponse,
  AuthAdminUserSessionsRevokedResponse,
} from '../../../types/admin'
import {
  actionHasInlineReason,
  assertExhaustive,
  type RevokeActionState,
} from '../lib/revokeActionState'

type RequestAuth = <T>(path: string, init?: RequestInit) => Promise<T>

export type RevokeMutationContext = {
  userId: string
  reason?: string
}

export type UseRevokeActionHandlers = {
  onSingleRevoked?: (
    response: AuthAdminSessionRevokeResponse,
    ctx: RevokeMutationContext
  ) => void | Promise<void>
  onAllRevoked?: (
    response: AuthAdminUserSessionsRevokedResponse,
    ctx: RevokeMutationContext
  ) => void | Promise<void>
  onSuspiciousRevoked?: (
    response: AuthAdminSessionFilteredRevokeResponse,
    ctx: RevokeMutationContext
  ) => void | Promise<void>
  onFilterPreviewed?: (
    response: AuthAdminSessionFilteredRevokeResponse
  ) => void | Promise<void>
  onFilterExecuted?: (
    response: AuthAdminSessionFilteredRevokeResponse,
    ctx: RevokeMutationContext
  ) => void | Promise<void>
}

export type UseRevokeActionOptions = {
  requestAuth: RequestAuth
  handlers: UseRevokeActionHandlers
}

export type UseRevokeActionReturn = {
  action: RevokeActionState | null
  setAction: (next: RevokeActionState | null) => void
  updateAction: (patch: Partial<RevokeActionState>) => void
  clear: () => void
  requestOtp: () => Promise<void>
  confirm: () => Promise<void>
}

export function useRevokeAction({
  requestAuth,
  handlers,
}: UseRevokeActionOptions): UseRevokeActionReturn {
  const [action, setActionState] = useState<RevokeActionState | null>(null)
  const actionRef = useRef<RevokeActionState | null>(null)
  useEffect(() => {
    actionRef.current = action
  }, [action])

  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const commitAction = useCallback((next: RevokeActionState | null) => {
    actionRef.current = next
    setActionState(next)
  }, [])

  const setAction = useCallback(
    (next: RevokeActionState | null) => {
      commitAction(next)
    },
    [commitAction]
  )

  const updateAction = useCallback(
    (patch: Partial<RevokeActionState>) => {
      const current = actionRef.current
      if (!current) return
      commitAction({ ...current, ...patch } as RevokeActionState)
    },
    [commitAction]
  )

  const clear = useCallback(() => {
    commitAction(null)
  }, [commitAction])

  const requestOtp = useCallback(async () => {
    const current = actionRef.current
    if (!current) return
    commitAction({ ...current, submitting: true, error: null, info: null })
    try {
      await requestRevokeActionOtp(requestAuth)
      const latest = actionRef.current
      if (!latest) return
      commitAction({
        ...latest,
        otpRequested: true,
        submitting: false,
        info: 'A verification code was sent to your email.',
      })
    } catch (caught) {
      const latest = actionRef.current
      if (!latest) return
      commitAction({
        ...latest,
        submitting: false,
        error:
          caught instanceof Error
            ? caught.message
            : 'Unable to request a verification code right now.',
      })
    }
  }, [commitAction, requestAuth])

  const confirm = useCallback(async () => {
    const currentAction = actionRef.current
    if (!currentAction) return
    if (!currentAction.code.trim()) {
      commitAction({
        ...currentAction,
        error: 'Enter the one-time code before confirming this action.',
      })
      return
    }
    commitAction({
      ...currentAction,
      submitting: true,
      error: null,
      info: null,
    })

    try {
      const verification = await verifyRevokeActionOtp(
        requestAuth,
        currentAction.code.trim()
      )
      const trimmedReason = actionHasInlineReason(currentAction)
        ? currentAction.reason.trim() || undefined
        : undefined
      const ctx: RevokeMutationContext = {
        userId: currentAction.userId,
        reason: trimmedReason,
      }

      switch (currentAction.kind) {
        case 'single': {
          const response = await revokeAuthUserSession(
            requestAuth,
            currentAction.userId,
            currentAction.sessionId,
            { actionToken: verification.action_token, reason: trimmedReason }
          )
          commitAction(null)
          await handlersRef.current.onSingleRevoked?.(response, ctx)
          return
        }
        case 'all': {
          const response = await revokeAllAuthUserSessions(
            requestAuth,
            currentAction.userId,
            { actionToken: verification.action_token, reason: trimmedReason }
          )
          commitAction(null)
          await handlersRef.current.onAllRevoked?.(response, ctx)
          return
        }
        case 'suspicious': {
          const response = await revokeAuthUserSessionsByFilter(
            requestAuth,
            currentAction.userId,
            { is_suspicious: true, reason: trimmedReason },
            verification.action_token
          )
          commitAction(null)
          await handlersRef.current.onSuspiciousRevoked?.(response, ctx)
          return
        }
        case 'filterPreview': {
          const response = await revokeAuthUserSessionsByFilter(
            requestAuth,
            currentAction.userId,
            currentAction.payload,
            verification.action_token
          )
          commitAction(null)
          await handlersRef.current.onFilterPreviewed?.(response)
          return
        }
        case 'filterExecute': {
          const response = await revokeAuthUserSessionsByFilter(
            requestAuth,
            currentAction.userId,
            currentAction.payload,
            verification.action_token
          )
          commitAction(null)
          await handlersRef.current.onFilterExecuted?.(response, ctx)
          return
        }
        default:
          assertExhaustive(currentAction, 'RevokeActionState.kind')
      }
    } catch (caught) {
      commitAction({
        ...currentAction,
        submitting: false,
        error:
          caught instanceof Error
            ? caught.message
            : 'Unable to complete that revoke action right now.',
      })
    }
  }, [commitAction, requestAuth])

  return { action, setAction, updateAction, clear, requestOtp, confirm }
}
