import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import {
  getDashboard,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from '../../api/adminApi'
import {
  parseAdminNotification,
  parseAdminNotificationSnapshot,
  parseNotificationCreatedPayload,
  parseNotificationReadPayload,
} from '../../lib/notificationSseValidators'
import type {
  AdminDashboard,
  AdminNotification,
  AdminNotificationBulkReadResponse,
  AdminNotificationReadResult,
} from '../../types/admin'

type AdminShellContextValue = {
  summary: AdminDashboard | null
  summaryLoading: boolean
  refreshSummary: () => Promise<void>
  notifications: AdminNotification[]
  unreadNotificationCount: number
  notificationsLoading: boolean
  notificationsError: string | null
  markingAllNotificationsRead: boolean
  markNotificationRead: (notificationId: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

type NotificationState = {
  notifications: AdminNotification[]
  unreadCount: number
}

type SummaryRefreshState = {
  inFlight: boolean
  queued: boolean
  promise: Promise<void> | null
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null)

function countVisibleUnreadNotifications(notifications: AdminNotification[]) {
  return notifications.filter((notification) => !notification.read_at).length
}

function normalizeNotificationItems(items: unknown[]) {
  const notifications: AdminNotification[] = []

  items.forEach((candidate) => {
    const parsed = parseAdminNotification(candidate)
    if (parsed !== null) {
      notifications.push(parsed)
    }
  })

  return notifications
}

function upsertNotificationState(
  current: NotificationState,
  notification: AdminNotification
): NotificationState {
  const existing = current.notifications.find(
    (item) => item.id === notification.id
  )

  let unreadCount = current.unreadCount
  if (!existing) {
    if (notification.read_at === null) {
      unreadCount += 1
    }
  } else {
    if (existing.read_at !== null && notification.read_at === null) {
      unreadCount += 1
    }
    if (existing.read_at === null && notification.read_at !== null) {
      unreadCount = Math.max(0, unreadCount - 1)
    }
  }

  return {
    notifications: [
      notification,
      ...current.notifications.filter((item) => item.id !== notification.id),
    ]
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
      )
      .slice(0, 8),
    unreadCount,
  }
}

function applyReadResultToState(
  current: NotificationState,
  result: AdminNotificationReadResult
): NotificationState {
  const existing = current.notifications.find(
    (notification) => notification.id === result.id
  )

  let unreadCount = current.unreadCount
  if (existing) {
    if (existing.read_at === null && result.read_at !== null) {
      unreadCount = Math.max(0, unreadCount - 1)
    }
    if (existing.read_at !== null && result.read_at === null) {
      unreadCount += 1
    }
  } else if (result.read_at !== null) {
    unreadCount = Math.max(0, unreadCount - 1)
  }

  return {
    notifications: current.notifications.map((notification) =>
      notification.id === result.id
        ? { ...notification, read_at: result.read_at }
        : notification
    ),
    unreadCount,
  }
}

function applyBulkReadResultToState(
  current: NotificationState,
  response: AdminNotificationBulkReadResponse
): NotificationState {
  if (response.notifications.length === 0) return current

  const readLookup = new Map(
    response.notifications.map((result) => [result.id, result.read_at])
  )

  const nextNotifications = current.notifications.map((notification) => {
    const readAt = readLookup.get(notification.id)
    return readAt === undefined
      ? notification
      : { ...notification, read_at: readAt }
  })

  const unreadCount = Math.max(
    0,
    current.unreadCount - response.marked_count
  )

  return {
    notifications: nextNotifications,
    unreadCount,
  }
}

function logInvalidSsePayload(event: string, payload: unknown) {
  // Invalid frames are dropped silently on the UI but surfaced to the
  // browser console so engineers diagnosing a bad release can still see
  // them. We never include the raw payload in user-facing state.
  console.warn(
    `[admin-notifications] Dropped malformed "${event}" SSE payload.`,
    payload
  )
}

function parseSseBlock(block: string) {
  const normalized = block.replaceAll('\r\n', '\n')
  const lines = normalized.split('\n')
  let event = ''
  const dataLines: string[] = []

  lines.forEach((line) => {
    if (!line || line.startsWith(':')) return
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
      return
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim())
    }
  })

  if (!event || dataLines.length === 0) return null

  try {
    return {
      event,
      payload: JSON.parse(dataLines.join('\n')) as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

function shouldRefreshSummaryForNotificationType(type: string) {
  return (
    type === 'application_submitted' ||
    type === 'employer_review_requested' ||
    type === 'listing_review_requested'
  )
}

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const authState = auth.state
  const authRole = auth.authMe?.app_user?.app_role
  const requestTwa = auth.requestTwa
  const streamTwa = auth.streamTwa
  const [summary, setSummary] = useState<AdminDashboard | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  )
  const [markingAllNotificationsRead, setMarkingAllNotificationsRead] =
    useState(false)

  const summaryRefreshStateRef = useRef<SummaryRefreshState>({
    inFlight: false,
    queued: false,
    promise: null,
  })
  const notificationStateRef = useRef<NotificationState>({
    notifications: [],
    unreadCount: 0,
  })
  const markingAllNotificationsReadRef = useRef(false)

  const setNotificationState = useCallback((nextState: NotificationState) => {
    notificationStateRef.current = nextState
    setNotifications(nextState.notifications)
    setUnreadNotificationCount(nextState.unreadCount)
  }, [])

  const refreshSummary = useCallback(async () => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      setSummary(null)
      setSummaryLoading(false)
      return
    }

    if (summaryRefreshStateRef.current.inFlight) {
      summaryRefreshStateRef.current.queued = true
      return summaryRefreshStateRef.current.promise ?? Promise.resolve()
    }

    const runRefresh = async () => {
      summaryRefreshStateRef.current.inFlight = true
      setSummaryLoading(true)

      try {
        do {
          summaryRefreshStateRef.current.queued = false
          try {
            const nextSummary = await getDashboard(requestTwa)
            setSummary(nextSummary)
          } catch {
            setSummary(null)
          }
        } while (summaryRefreshStateRef.current.queued)
      } finally {
        summaryRefreshStateRef.current.inFlight = false
        summaryRefreshStateRef.current.promise = null
        setSummaryLoading(false)
      }
    }

    const promise = runRefresh()
    summaryRefreshStateRef.current.promise = promise
    return promise
  }, [authRole, authState, requestTwa])

  useEffect(() => {
    void refreshSummary()
  }, [refreshSummary])

  useEffect(() => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      setNotificationState({ notifications: [], unreadCount: 0 })
      setNotificationsLoading(false)
      setNotificationsError(null)
      setMarkingAllNotificationsRead(false)
      return
    }

    let active = true
    setNotificationsLoading(true)
    setNotificationsError(null)

    void listMyNotifications(requestTwa, { pageSize: 8 })
      .then((response) => {
        if (!active) return
        const nextNotifications = normalizeNotificationItems(response.items)
        setNotificationState({
          notifications: nextNotifications,
          unreadCount: countVisibleUnreadNotifications(nextNotifications),
        })
      })
      .catch((error: Error) => {
        if (!active) return
        setNotificationsError(error.message)
      })
      .finally(() => {
        if (active) setNotificationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [authRole, authState, requestTwa, setNotificationState])

  useEffect(() => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      return
    }

    let active = true
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0
    let streamController: AbortController | null = null
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null
    let connectGeneration = 0

    const scheduleReconnect = () => {
      if (!active) return
      if (reconnectTimer !== null) return
      const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000)
      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        void connect()
      }, delay)
    }

    const connect = async () => {
      if (!active) return

      if (streamController) {
        streamController.abort()
      }
      if (activeReader) {
        try {
          await activeReader.cancel()
        } catch {
          // reader may already be closed; ignore
        }
        activeReader = null
      }

      const generation = ++connectGeneration
      const controller = new AbortController()
      streamController = controller

      try {
        const response = await streamTwa('/api/v1/notifications/stream', {
          headers: {
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        })

        if (!active || generation !== connectGeneration) {
          return
        }

        if (!response.body) {
          throw new Error('Notification stream is unavailable.')
        }

        reconnectAttempt = 0
        setNotificationsError(null)

        const reader = response.body.getReader()
        activeReader = reader
        const decoder = new TextDecoder()
        let buffer = ''

        while (active && generation === connectGeneration) {
          const { value, done } = await reader.read()
          if (done) throw new Error('Notification stream disconnected.')

          buffer += decoder
            .decode(value, { stream: true })
            .replaceAll('\r\n', '\n')
          let boundaryIndex = buffer.indexOf('\n\n')

          while (boundaryIndex !== -1) {
            const block = buffer.slice(0, boundaryIndex)
            buffer = buffer.slice(boundaryIndex + 2)
            const parsed = parseSseBlock(block)

            if (parsed?.event === 'snapshot') {
              const snapshot = parseAdminNotificationSnapshot(parsed.payload)
              if (snapshot === null) {
                logInvalidSsePayload('snapshot', parsed.payload)
              } else {
                setNotificationState({
                  notifications: snapshot.notifications,
                  unreadCount: snapshot.unread_count,
                })
              }
            }

            if (parsed?.event === 'notification.created') {
              const payload = parseNotificationCreatedPayload(parsed.payload)
              if (payload === null) {
                logInvalidSsePayload('notification.created', parsed.payload)
              } else {
                setNotificationState(
                  upsertNotificationState(
                    notificationStateRef.current,
                    payload.notification
                  )
                )
                if (
                  shouldRefreshSummaryForNotificationType(
                    payload.notification.type
                  )
                ) {
                  void refreshSummary()
                }
              }
            }

            if (parsed?.event === 'notification.read') {
              const payload = parseNotificationReadPayload(parsed.payload)
              if (payload === null) {
                logInvalidSsePayload('notification.read', parsed.payload)
              } else {
                setNotificationState(
                  applyReadResultToState(
                    notificationStateRef.current,
                    payload.notification
                  )
                )
              }
            }

            boundaryIndex = buffer.indexOf('\n\n')
          }
        }
      } catch (error) {
        const streamError =
          error instanceof Error
            ? error
            : new Error('Notification stream connection failed.')

        if (
          !active ||
          generation !== connectGeneration ||
          streamError.name === 'AbortError'
        ) {
          return
        }

        scheduleReconnect()
      } finally {
        if (generation === connectGeneration) {
          activeReader = null
          streamController = null
        }
      }
    }

    void connect()

    return () => {
      active = false
      connectGeneration += 1
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      streamController?.abort()
      if (activeReader) {
        void activeReader.cancel().catch(() => {})
        activeReader = null
      }
    }
  }, [authRole, authState, refreshSummary, setNotificationState, streamTwa])

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await markMyNotificationRead(
          requestTwa,
          notificationId
        )
        setNotificationState(
          applyReadResultToState(
            notificationStateRef.current,
            response.notification
          )
        )
      } catch (error) {
        setNotificationsError(
          error instanceof Error
            ? error.message
            : 'Unable to update that notification right now.'
        )
      }
    },
    [requestTwa, setNotificationState]
  )

  const markAllNotificationsRead = useCallback(async () => {
    if (
      notificationStateRef.current.unreadCount === 0 ||
      markingAllNotificationsReadRef.current
    ) {
      return
    }

    markingAllNotificationsReadRef.current = true
    setMarkingAllNotificationsRead(true)
    setNotificationsError(null)

    try {
      const response = await markAllMyNotificationsRead(requestTwa)
      setNotificationState(
        applyBulkReadResultToState(notificationStateRef.current, response)
      )
      if (response.marked_count > 0) {
        toast.success('All notifications marked as read.')
      }
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Unable to mark all notifications as read right now.'
      )
    } finally {
      markingAllNotificationsReadRef.current = false
      setMarkingAllNotificationsRead(false)
    }
  }, [requestTwa, setNotificationState])

  const value = useMemo(
    () => ({
      summary,
      summaryLoading,
      refreshSummary,
      notifications,
      unreadNotificationCount,
      notificationsLoading,
      notificationsError,
      markingAllNotificationsRead,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      markAllNotificationsRead,
      markNotificationRead,
      markingAllNotificationsRead,
      notifications,
      notificationsError,
      notificationsLoading,
      refreshSummary,
      summary,
      summaryLoading,
      unreadNotificationCount,
    ]
  )

  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  )
}

export function useAdminShell() {
  const context = useContext(AdminShellContext)
  if (!context) {
    throw new Error('useAdminShell must be used within an AdminShellProvider.')
  }
  return context
}
