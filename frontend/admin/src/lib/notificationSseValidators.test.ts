import { describe, expect, test } from 'vitest'

import type {
  AdminNotification,
  AdminNotificationTarget,
  AdminNotificationReadResult,
} from '../types/admin'
import {
  parseAdminNotification,
  parseAdminNotificationReadResult,
  parseAdminNotificationSnapshot,
  parseNotificationCreatedPayload,
  parseNotificationReadPayload,
} from './notificationSseValidators'

const validNotification: AdminNotification = {
  id: '5cf7f98c-dbf7-4a98-9a37-60e71f2bb51d',
  type: 'application.created',
  channel: 'in_app',
  title: 'New application',
  body: 'A jobseeker applied to your listing.',
  read_at: null,
  created_at: '2026-04-22T12:34:56.000Z',
  target: {
    kind: 'admin_route',
    href: '/applications',
    entity_id: null,
  },
}

const validReadResult: AdminNotificationReadResult = {
  id: '5cf7f98c-dbf7-4a98-9a37-60e71f2bb51d',
  read_at: '2026-04-22T13:00:00.000Z',
}

describe('parseAdminNotification', () => {
  test('accepts a well-formed notification', () => {
    const result = parseAdminNotification(validNotification)
    expect(result).toEqual(validNotification)
  })

  test('accepts null read_at', () => {
    const result = parseAdminNotification({
      ...validNotification,
      read_at: null,
    })
    expect(result?.read_at).toBeNull()
  })

  test('accepts a valid notification target', () => {
    const target: AdminNotificationTarget = {
      kind: 'admin_route',
      href: '/employers/queue',
      entity_id: 'employer-1',
    }
    const result = parseAdminNotification({
      ...validNotification,
      target,
    })
    expect(result?.target).toEqual(target)
  })

  test('drops malformed notification targets instead of rejecting the notification', () => {
    const result = parseAdminNotification({
      ...validNotification,
      target: {
        kind: 42,
        href: '/applications',
      },
    })
    expect(result).not.toBeNull()
    expect(result?.target).toBeNull()
  })

  test('rejects non-objects', () => {
    expect(parseAdminNotification(null)).toBeNull()
    expect(parseAdminNotification(undefined)).toBeNull()
    expect(parseAdminNotification('string')).toBeNull()
    expect(parseAdminNotification(42)).toBeNull()
    expect(parseAdminNotification([])).toBeNull()
  })

  test('rejects when required fields are missing', () => {
    const missingId: Partial<AdminNotification> = { ...validNotification }
    delete missingId.id
    expect(parseAdminNotification(missingId)).toBeNull()

    const missingCreated: Partial<AdminNotification> = { ...validNotification }
    delete missingCreated.created_at
    expect(parseAdminNotification(missingCreated)).toBeNull()
  })

  test('rejects when required fields have wrong types', () => {
    expect(parseAdminNotification({ ...validNotification, id: 42 })).toBeNull()
    expect(
      parseAdminNotification({ ...validNotification, title: null })
    ).toBeNull()
    expect(
      parseAdminNotification({ ...validNotification, read_at: 123 })
    ).toBeNull()
    expect(
      parseAdminNotification({ ...validNotification, created_at: null })
    ).toBeNull()
  })

  test('strips extra fields — does not keep attacker-controlled properties', () => {
    const parsed = parseAdminNotification({
      ...validNotification,
      __proto__Polluted: true,
      arbitrary: { nested: 'value' },
    })
    expect(parsed).not.toBeNull()
    expect(parsed).not.toHaveProperty('arbitrary')
    expect(parsed).not.toHaveProperty('__proto__Polluted')
  })
})

describe('parseAdminNotificationReadResult', () => {
  test('accepts a valid read result', () => {
    expect(parseAdminNotificationReadResult(validReadResult)).toEqual(
      validReadResult
    )
  })

  test('accepts null read_at', () => {
    expect(
      parseAdminNotificationReadResult({ ...validReadResult, read_at: null })
    ).toEqual({ ...validReadResult, read_at: null })
  })

  test('rejects non-objects and missing id', () => {
    expect(parseAdminNotificationReadResult(null)).toBeNull()
    expect(parseAdminNotificationReadResult({ read_at: null })).toBeNull()
    expect(parseAdminNotificationReadResult({ id: 5 })).toBeNull()
  })
})

describe('parseAdminNotificationSnapshot', () => {
  test('accepts a valid snapshot', () => {
    const snapshot = {
      notifications: [validNotification],
      unread_count: 1,
    }
    expect(parseAdminNotificationSnapshot(snapshot)).toEqual(snapshot)
  })

  test('accepts an empty notifications array', () => {
    const snapshot = { notifications: [], unread_count: 0 }
    expect(parseAdminNotificationSnapshot(snapshot)).toEqual(snapshot)
  })

  test('rejects when notifications is not an array', () => {
    expect(
      parseAdminNotificationSnapshot({ notifications: null, unread_count: 0 })
    ).toBeNull()
    expect(
      parseAdminNotificationSnapshot({ notifications: {}, unread_count: 0 })
    ).toBeNull()
  })

  test('rejects when unread_count is not a non-negative integer', () => {
    expect(
      parseAdminNotificationSnapshot({
        notifications: [],
        unread_count: -1,
      })
    ).toBeNull()
    expect(
      parseAdminNotificationSnapshot({
        notifications: [],
        unread_count: 1.5,
      })
    ).toBeNull()
    expect(
      parseAdminNotificationSnapshot({
        notifications: [],
        unread_count: '0',
      })
    ).toBeNull()
  })

  test('rejects the whole snapshot if any notification is malformed', () => {
    const snapshot = {
      notifications: [validNotification, { id: 42 }],
      unread_count: 2,
    }
    expect(parseAdminNotificationSnapshot(snapshot)).toBeNull()
  })

  test('rejects non-objects', () => {
    expect(parseAdminNotificationSnapshot(null)).toBeNull()
    expect(parseAdminNotificationSnapshot([])).toBeNull()
    expect(parseAdminNotificationSnapshot('oops')).toBeNull()
  })
})

describe('parseNotificationCreatedPayload', () => {
  test('accepts a valid created payload', () => {
    const payload = { notification: validNotification }
    expect(parseNotificationCreatedPayload(payload)).toEqual(payload)
  })

  test('rejects when notification is missing', () => {
    expect(parseNotificationCreatedPayload({})).toBeNull()
  })

  test('rejects when notification is malformed', () => {
    expect(
      parseNotificationCreatedPayload({ notification: { id: 'only-id' } })
    ).toBeNull()
  })
})

describe('parseNotificationReadPayload', () => {
  test('accepts a valid read payload', () => {
    const payload = { notification: validReadResult }
    expect(parseNotificationReadPayload(payload)).toEqual(payload)
  })

  test('rejects when notification is missing', () => {
    expect(parseNotificationReadPayload({})).toBeNull()
  })

  test('rejects when notification is malformed', () => {
    expect(
      parseNotificationReadPayload({ notification: { read_at: null } })
    ).toBeNull()
  })
})
