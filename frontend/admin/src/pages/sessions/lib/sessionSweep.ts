import type { AuthAdminSessionFilterRevokeInput } from '../../../types/admin'
import { formatDateTime } from '../../../lib/formatting'

export type SessionSweepDraft = {
  isSuspiciousOnly: boolean
  createdAfter: string
  createdBefore: string
  lastSeenAfter: string
  lastSeenBefore: string
  ipAddress: string
  userAgentContains: string
  reason: string
}

export type SweepDateParseResult = {
  value: string | undefined
  error: string | null
}

export type SweepPayloadResult = {
  payload: AuthAdminSessionFilterRevokeInput | null
  error: string | null
}

export function buildDefaultSessionSweepDraft(): SessionSweepDraft {
  return {
    isSuspiciousOnly: false,
    createdAfter: '',
    createdBefore: '',
    lastSeenAfter: '',
    lastSeenBefore: '',
    ipAddress: '',
    userAgentContains: '',
    reason: '',
  }
}

export function parseSweepDateTime(
  value: string,
  label: string
): SweepDateParseResult {
  if (!value.trim()) {
    return { value: undefined, error: null }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return {
      value: undefined,
      error: `Enter a valid ${label.toLowerCase()} timestamp.`,
    }
  }

  return { value: parsed.toISOString(), error: null }
}

export function buildSessionSweepPayload(
  draft: SessionSweepDraft
): SweepPayloadResult {
  const createdAfter = parseSweepDateTime(draft.createdAfter, 'Created after')
  if (createdAfter.error) return { payload: null, error: createdAfter.error }

  const createdBefore = parseSweepDateTime(
    draft.createdBefore,
    'Created before'
  )
  if (createdBefore.error) return { payload: null, error: createdBefore.error }

  const lastSeenAfter = parseSweepDateTime(
    draft.lastSeenAfter,
    'Last seen after'
  )
  if (lastSeenAfter.error) return { payload: null, error: lastSeenAfter.error }

  const lastSeenBefore = parseSweepDateTime(
    draft.lastSeenBefore,
    'Last seen before'
  )
  if (lastSeenBefore.error) {
    return { payload: null, error: lastSeenBefore.error }
  }

  if (
    createdAfter.value &&
    createdBefore.value &&
    new Date(createdAfter.value).getTime() >
      new Date(createdBefore.value).getTime()
  ) {
    return {
      payload: null,
      error: 'Created after must be earlier than created before.',
    }
  }

  if (
    lastSeenAfter.value &&
    lastSeenBefore.value &&
    new Date(lastSeenAfter.value).getTime() >
      new Date(lastSeenBefore.value).getTime()
  ) {
    return {
      payload: null,
      error: 'Last seen after must be earlier than last seen before.',
    }
  }

  const payload: AuthAdminSessionFilterRevokeInput = {}
  if (draft.isSuspiciousOnly) payload.is_suspicious = true
  if (createdAfter.value) payload.created_after = createdAfter.value
  if (createdBefore.value) payload.created_before = createdBefore.value
  if (lastSeenAfter.value) payload.last_seen_after = lastSeenAfter.value
  if (lastSeenBefore.value) payload.last_seen_before = lastSeenBefore.value

  const trimmedIpAddress = draft.ipAddress.trim()
  if (trimmedIpAddress) payload.ip_address = trimmedIpAddress

  const trimmedUserAgent = draft.userAgentContains.trim()
  if (trimmedUserAgent) payload.user_agent_contains = trimmedUserAgent

  const hasSelector =
    payload.is_suspicious === true ||
    Boolean(payload.created_after) ||
    Boolean(payload.created_before) ||
    Boolean(payload.last_seen_after) ||
    Boolean(payload.last_seen_before) ||
    Boolean(payload.ip_address) ||
    Boolean(payload.user_agent_contains)

  if (!hasSelector) {
    return {
      payload: null,
      error: 'Choose at least one filter before previewing a sweep.',
    }
  }

  const trimmedReason = draft.reason.trim()
  if (trimmedReason) payload.reason = trimmedReason

  return { payload, error: null }
}

export function describeSessionSweep(
  payload: AuthAdminSessionFilterRevokeInput
): string {
  const segments: string[] = []

  if (payload.is_suspicious) segments.push('suspicious sessions')
  if (payload.ip_address) segments.push(`IP ${payload.ip_address}`)
  if (payload.user_agent_contains) {
    segments.push(`user agent containing "${payload.user_agent_contains}"`)
  }
  if (payload.created_after) {
    segments.push(`created after ${formatDateTime(payload.created_after)}`)
  }
  if (payload.created_before) {
    segments.push(`created before ${formatDateTime(payload.created_before)}`)
  }
  if (payload.last_seen_after) {
    segments.push(`seen after ${formatDateTime(payload.last_seen_after)}`)
  }
  if (payload.last_seen_before) {
    segments.push(`seen before ${formatDateTime(payload.last_seen_before)}`)
  }

  if (segments.length === 0) return 'the selected filters'
  if (segments.length === 1) return segments[0]

  return `${segments.slice(0, -1).join(', ')} and ${segments.at(-1)}`
}
