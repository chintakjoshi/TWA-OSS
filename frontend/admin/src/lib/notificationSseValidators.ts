import type {
  AdminNotification,
  AdminNotificationReadResult,
  AdminNotificationSnapshot,
  AdminNotificationTarget,
} from '../types/admin'

/**
 * Runtime validators for server-sent event payloads used by the admin
 * notification stream.
 *
 * Why this file exists:
 *   SSE data arrives from the network as `unknown`. Without validation, a
 *   malformed frame (whether from a buggy backend release, a proxy rewriting
 *   bodies, or a man-in-the-middle) would be blindly cast into React state
 *   and either (a) silently corrupt the UI or (b) crash inside a `setState`
 *   updater and take the whole app down.
 *
 * Design goals:
 *   - Pure, synchronous, allocation-light; safe to run on every SSE frame.
 *   - Return a validated, plain object (never the caller-supplied reference),
 *     so downstream state is free of extra/attacker-controlled properties.
 *   - Return `null` on any deviation — callers decide how to log/recover.
 *   - Match the backend contract in `backend/app/schemas/notifications.py`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isFinite(value)
  )
}

function parseAdminNotificationTarget(
  input: unknown
): AdminNotificationTarget | null {
  if (!isRecord(input)) return null

  const { kind, href, entity_id } = input

  if (!isString(kind)) return null
  if (!isString(href)) return null
  if (!isStringOrNull(entity_id)) return null

  return {
    kind,
    href,
    entity_id,
  }
}

export function parseAdminNotification(
  input: unknown
): AdminNotification | null {
  if (!isRecord(input)) return null

  const { id, type, channel, title, body, read_at, created_at, target } = input

  if (!isString(id)) return null
  if (!isString(type)) return null
  if (!isString(channel)) return null
  if (!isString(title)) return null
  if (!isString(body)) return null
  if (!isStringOrNull(read_at)) return null
  if (!isString(created_at)) return null

  // Invalid targets should not crash the UI or drop the rest of a valid
  // notification payload. We keep the notification and treat the row as
  // non-clickable until the backend sends a valid target.
  const parsedTarget =
    target === undefined || target === null
      ? null
      : parseAdminNotificationTarget(target)

  // Return a fresh object — never pass the caller-supplied reference through,
  // so downstream state cannot pick up attacker-controlled extra fields.
  return {
    id,
    type,
    channel,
    title,
    body,
    read_at,
    created_at,
    target: parsedTarget,
  }
}

export function parseAdminNotificationReadResult(
  input: unknown
): AdminNotificationReadResult | null {
  if (!isRecord(input)) return null

  const { id, read_at } = input

  if (!isString(id)) return null
  if (!isStringOrNull(read_at)) return null

  return { id, read_at }
}

export function parseAdminNotificationSnapshot(
  input: unknown
): AdminNotificationSnapshot | null {
  if (!isRecord(input)) return null

  const { notifications, unread_count } = input

  if (!Array.isArray(notifications)) return null
  if (!isNonNegativeInteger(unread_count)) return null

  const parsedNotifications: AdminNotification[] = []
  for (const candidate of notifications) {
    const parsed = parseAdminNotification(candidate)
    // Strict: one bad notification invalidates the whole snapshot. Partial
    // snapshots would leave the UI with an inconsistent unread_count.
    if (parsed === null) return null
    parsedNotifications.push(parsed)
  }

  return {
    notifications: parsedNotifications,
    unread_count,
  }
}

export function parseNotificationCreatedPayload(
  input: unknown
): { notification: AdminNotification } | null {
  if (!isRecord(input)) return null
  const notification = parseAdminNotification(input.notification)
  if (notification === null) return null
  return { notification }
}

export function parseNotificationReadPayload(
  input: unknown
): { notification: AdminNotificationReadResult } | null {
  if (!isRecord(input)) return null
  const notification = parseAdminNotificationReadResult(input.notification)
  if (notification === null) return null
  return { notification }
}
