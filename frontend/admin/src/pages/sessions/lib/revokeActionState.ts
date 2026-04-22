import type { AuthAdminSessionFilterRevokeInput } from '../../../types/admin'

export type RevokeActionKind =
  | 'single'
  | 'all'
  | 'suspicious'
  | 'filterPreview'
  | 'filterExecute'

export type BaseActionState = {
  userId: string
  title: string
  description: string
  otpRequested: boolean
  code: string
  error: string | null
  info: string | null
  submitting: boolean
}

export type SingleRevokeActionState = BaseActionState & {
  kind: 'single'
  sessionId: string
  reason: string
}

export type AllRevokeActionState = BaseActionState & {
  kind: 'all'
  reason: string
}

export type SuspiciousRevokeActionState = BaseActionState & {
  kind: 'suspicious'
  reason: string
}

export type FilterPreviewActionState = BaseActionState & {
  kind: 'filterPreview'
  payload: AuthAdminSessionFilterRevokeInput
}

export type FilterExecuteActionState = BaseActionState & {
  kind: 'filterExecute'
  payload: AuthAdminSessionFilterRevokeInput
}

export type InlineReasonActionState =
  | SingleRevokeActionState
  | AllRevokeActionState
  | SuspiciousRevokeActionState

export type FilterActionState =
  | FilterPreviewActionState
  | FilterExecuteActionState

export type RevokeActionState = InlineReasonActionState | FilterActionState

type InlineReasonInit =
  | Pick<
      SingleRevokeActionState,
      'kind' | 'userId' | 'sessionId' | 'title' | 'description'
    >
  | Pick<AllRevokeActionState, 'kind' | 'userId' | 'title' | 'description'>
  | Pick<
      SuspiciousRevokeActionState,
      'kind' | 'userId' | 'title' | 'description'
    >

type FilterActionInit = Pick<
  FilterPreviewActionState | FilterExecuteActionState,
  'kind' | 'userId' | 'title' | 'description' | 'payload'
>

const BASE_BOILERPLATE = {
  reason: '',
  otpRequested: false,
  code: '',
  error: null,
  info: null,
  submitting: false,
} as const

export function buildInlineReasonActionState(
  init: InlineReasonInit
): InlineReasonActionState {
  if (init.kind === 'single') {
    return { ...init, ...BASE_BOILERPLATE }
  }
  return { ...init, ...BASE_BOILERPLATE }
}

export function buildFilterActionState(
  init: FilterActionInit
): FilterActionState {
  return {
    ...init,
    otpRequested: false,
    code: '',
    error: null,
    info: null,
    submitting: false,
  }
}

export function actionHasInlineReason(
  state: RevokeActionState
): state is InlineReasonActionState {
  return (
    state.kind === 'single' ||
    state.kind === 'all' ||
    state.kind === 'suspicious'
  )
}

export function actionConfirmLabel(state: RevokeActionState): string {
  return state.kind === 'filterPreview' ? 'Confirm preview' : 'Confirm revoke'
}

export function actionSubmittingLabel(state: RevokeActionState): string {
  return state.kind === 'filterPreview' ? 'Previewing...' : 'Revoking...'
}

export function assertExhaustive(value: never, context: string): never {
  throw new Error(`Unhandled ${context}: ${String(value)}`)
}
