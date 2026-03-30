import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BellRing, ChevronUp, Menu, Plus, Settings2, X } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import {
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from '../../api/adminApi'
import { announceComingSoon } from '../../lib/comingSoon'
import { cn } from '../../lib/cn'
import { formatRelativeTime } from '../../lib/formatting'
import type {
  AdminNotification,
  AdminNotificationReadResult,
  AdminNotificationSnapshot,
} from '../../types/admin'
import { useAdminShell } from './AdminShellProvider'
import { adminNavItems } from './adminNav'
import { AdminButton } from '../ui/AdminUi'

function isItemActive(
  pathname: string,
  href: string,
  activePrefixes?: string[],
  inactivePrefixes?: string[]
) {
  if (inactivePrefixes?.some((prefix) => pathname.startsWith(prefix))) {
    return false
  }
  if (activePrefixes?.some((prefix) => pathname.startsWith(prefix))) return true
  if (href === '/dashboard') return pathname === href
  return pathname === href
}

function getProfileInitials(email: string | null | undefined) {
  const fallback = 'AD'
  if (!email) return fallback
  return email.slice(0, 2).toUpperCase() || fallback
}

function upsertNotification(
  current: AdminNotification[],
  notification: AdminNotification
) {
  return [
    notification,
    ...current.filter((item) => item.id !== notification.id),
  ]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
    )
    .slice(0, 8)
}

function applyReadResult(
  current: AdminNotification[],
  result: AdminNotificationReadResult
) {
  return current.map((notification) =>
    notification.id === result.id
      ? { ...notification, read_at: result.read_at }
      : notification
  )
}

function applyReadResults(
  current: AdminNotification[],
  results: AdminNotificationReadResult[]
) {
  if (results.length === 0) return current
  const readLookup = new Map(results.map((result) => [result.id, result.read_at]))
  return current.map((notification) => {
    const readAt = readLookup.get(notification.id)
    return readAt === undefined ? notification : { ...notification, read_at: readAt }
  })
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

const sectionOrder = [
  ['overview', 'Overview'],
  ['people', 'People'],
  ['employers', 'Employers'],
  ['listings', 'Job Listings'],
  ['tracking', 'Tracking'],
  ['settings', 'Settings'],
] as const

export function AdminWorkspaceLayout({
  title,
  primaryActionLabel,
  onPrimaryAction,
  children,
}: {
  title: string
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  children: ReactNode
}) {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { summary } = useAdminShell()
  const authState = auth.state
  const authRole = auth.authMe?.app_user?.app_role
  const authEmail = auth.authMe?.app_user?.email
  const requestTwa = auth.requestTwa
  const streamTwa = auth.streamTwa
  const logout = auth.logout
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  )
  const [markingAllNotificationsRead, setMarkingAllNotificationsRead] =
    useState(false)

  const notificationMenuRef = useRef<HTMLDivElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const sections = sectionOrder.map(([key, label]) => ({
    key,
    label,
    items: adminNavItems.filter((item) => item.section === key),
  }))

  useEffect(() => {
    setSidebarOpen(false)
    setNotificationsOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleWindowClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        notificationsOpen &&
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setNotificationsOpen(false)
      }
      if (
        profileMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleWindowClick)
    return () => window.removeEventListener('mousedown', handleWindowClick)
  }, [notificationsOpen, profileMenuOpen])

  useEffect(() => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      setNotifications([])
      setUnreadCount(0)
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
        setNotifications(response.items)
        setUnreadCount(
          response.items.filter((notification) => !notification.read_at).length
        )
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
  }, [authRole, authState, requestTwa])

  useEffect(() => {
    if (authState !== 'authenticated' || authRole !== 'staff') {
      return
    }

    let active = true
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0
    let streamController: AbortController | null = null

    const scheduleReconnect = () => {
      if (!active) return
      const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000)
      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(() => {
        void connect()
      }, delay)
    }

    const connect = async () => {
      streamController = new AbortController()

      try {
        const response = await streamTwa('/api/v1/notifications/stream', {
          headers: {
            Accept: 'text/event-stream',
          },
          signal: streamController.signal,
        })

        if (!response.body) {
          throw new Error('Notification stream is unavailable.')
        }

        reconnectAttempt = 0
        setNotificationsError(null)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (active) {
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
              const snapshot =
                parsed.payload as unknown as AdminNotificationSnapshot
              setNotifications(snapshot.notifications)
              setUnreadCount(snapshot.unread_count)
            }

            if (parsed?.event === 'notification.created') {
              const notification = parsed.payload
                .notification as AdminNotification
              setNotifications((current) =>
                upsertNotification(current, notification)
              )
              setUnreadCount((current) => current + 1)
            }

            if (parsed?.event === 'notification.read') {
              const result = parsed.payload
                .notification as AdminNotificationReadResult
              setNotifications((current) => applyReadResult(current, result))
              setUnreadCount((current) => Math.max(0, current - 1))
            }

            boundaryIndex = buffer.indexOf('\n\n')
          }
        }
      } catch (error) {
        const streamError =
          error instanceof Error
            ? error
            : new Error('Notification stream connection failed.')

        if (!active || streamError.name === 'AbortError') {
          return
        }

        scheduleReconnect()
      }
    }

    void connect()

    return () => {
      active = false
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      streamController?.abort()
    }
  }, [authRole, authState, streamTwa])

  async function handleMarkNotificationRead(notificationId: string) {
    try {
      const response = await markMyNotificationRead(requestTwa, notificationId)
      setNotifications((current) =>
        applyReadResult(current, response.notification)
      )
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Unable to update that notification right now.'
      )
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (unreadCount === 0 || markingAllNotificationsRead) return

    setMarkingAllNotificationsRead(true)
    setNotificationsError(null)

    try {
      const response = await markAllMyNotificationsRead(requestTwa)
      setNotifications((current) =>
        applyReadResults(current, response.notifications)
      )
      setUnreadCount(0)
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
      setMarkingAllNotificationsRead(false)
    }
  }

  const shellContent = (
    <>
      <div className="relative z-30 shrink-0 border-b border-[#ddcfba] bg-white/85 px-4 py-4 backdrop-blur sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ddcfba] bg-white text-slate-700 lg:hidden"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="admin-display text-[1.9rem] leading-none font-semibold text-slate-950">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={notificationMenuRef}>
              <button
                aria-label="Notifications"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ddd1be] bg-white text-slate-700 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false)
                  setNotificationsOpen((open) => !open)
                }}
              >
                <BellRing className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              {unreadCount > 0 ? (
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#d0922c] px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
              {notificationsOpen ? (
                <div className="absolute right-0 top-[calc(100%+12px)] z-[80] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-[#dacdb8] bg-[#fffdf9] shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
                  <div className="border-b border-[#eadfce] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Notifications
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} unread item${unreadCount === 1 ? '' : 's'}`
                            : 'All caught up'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-[#eadfce] px-3 text-xs font-semibold text-[#b77712] transition hover:border-[#d9ccb6] hover:bg-[#faf7f1] hover:text-[#8f5b08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60 disabled:cursor-not-allowed disabled:border-[#efe6d8] disabled:text-slate-300 disabled:hover:bg-transparent"
                          type="button"
                          disabled={unreadCount === 0 || markingAllNotificationsRead}
                          onClick={() => void handleMarkAllNotificationsRead()}
                        >
                          {markingAllNotificationsRead
                            ? 'Marking...'
                            : 'Mark all read'}
                        </button>
                        <button
                          aria-label="Notification settings"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#eadfce] bg-white text-[#b77712] transition hover:border-[#d9ccb6] hover:bg-[#faf7f1] hover:text-[#8f5b08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false)
                            navigate('/notifications')
                          }}
                        >
                          <Settings2 className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-5 py-6 text-sm text-slate-500">
                        Loading notifications...
                      </div>
                    ) : null}

                    {!notificationsLoading && notificationsError ? (
                      <div className="space-y-3 px-5 py-6">
                        <p className="text-sm text-[#a83932]">
                          {notificationsError}
                        </p>
                        <button
                          className="text-sm font-semibold text-[#b77712] transition hover:text-[#8f5b08]"
                          type="button"
                          onClick={() => navigate(0)}
                        >
                          Refresh page
                        </button>
                      </div>
                    ) : null}

                    {!notificationsLoading &&
                    !notificationsError &&
                    notifications.length === 0 ? (
                      <div className="px-5 py-6 text-sm text-slate-500">
                        No notifications right now.
                      </div>
                    ) : null}

                    {!notificationsLoading && !notificationsError ? (
                      <ul>
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className="border-b border-[#eadfce] px-5 py-4 last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {notification.title}
                                  </p>
                                  {!notification.read_at ? (
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d0922c]" />
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {notification.body}
                                </p>
                                <p className="mt-2 text-xs text-[#89a0c4]">
                                  {formatRelativeTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.read_at ? (
                                <button
                                  className="shrink-0 text-xs font-semibold text-[#b77712] transition hover:text-[#8f5b08]"
                                  type="button"
                                  onClick={() =>
                                    void handleMarkNotificationRead(
                                      notification.id
                                    )
                                  }
                                >
                                  Mark read
                                </button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <AdminButton
              variant="secondary"
              onClick={() => announceComingSoon('Export')}
            >
              Export
            </AdminButton>
            {primaryActionLabel && onPrimaryAction ? (
              <AdminButton icon={Plus} onClick={onPrimaryAction}>
                {primaryActionLabel}
              </AdminButton>
            ) : null}
          </div>
        </div>
      </div>

      <main className="relative z-0 flex-1 overflow-y-auto px-4 py-7 sm:px-7">
        {children}
      </main>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f7f1e5] text-slate-800 lg:h-screen lg:overflow-hidden">
      <div className="lg:grid lg:h-screen lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[252px] border-r border-[#1f3145] bg-[#132130] text-white transition lg:static lg:block lg:h-screen',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.key} className="space-y-1.5">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7e98be]">
                      {section.label}
                    </p>
                    <nav className="space-y-1">
                      {section.items.map((item) => {
                        const active = isItemActive(
                          location.pathname,
                          item.href,
                          item.activePrefixes,
                          item.inactivePrefixes
                        )
                        const Icon = item.icon
                        const badgeValue =
                          item.badgeKey && summary
                            ? summary[item.badgeKey]
                            : null

                        return (
                          <NavLink
                            key={item.href}
                            className={cn(
                              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                              active
                                ? 'bg-white/10 text-[#ffb13d]'
                                : 'text-[#d4deea] hover:bg-white/6 hover:text-white'
                            )}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.8}
                            />
                            <span className="min-w-0 flex-1">{item.label}</span>
                            {badgeValue && badgeValue > 0 ? (
                              <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#d99a2b] px-2 text-xs font-semibold text-white">
                                {badgeValue}
                              </span>
                            ) : null}
                          </NavLink>
                        )
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="relative border-t border-white/7 px-4 py-4"
              ref={profileMenuRef}
            >
              {profileMenuOpen ? (
                <div className="absolute bottom-[calc(100%-8px)] left-4 right-4 z-20 overflow-hidden rounded-[20px] border border-[#30475f] bg-[#1b2d40] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/6"
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      announceComingSoon('Your profile')
                    }}
                  >
                    <span>Your profile</span>
                    <span className="text-xs uppercase tracking-[0.14em] text-[#8ea3c4]">
                      Placeholder
                    </span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between border-t border-white/8 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/6"
                    type="button"
                    onClick={() => void logout()}
                  >
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}

              <button
                className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/6"
                type="button"
                onClick={() => {
                  setNotificationsOpen(false)
                  setProfileMenuOpen((open) => !open)
                }}
              >
                <div className="grid h-10 w-10 place-items-center rounded-full border border-[#8c7340] bg-[#243245] font-semibold text-[#ffb13d]">
                  {getProfileInitials(authEmail)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {authEmail ?? 'TWA Staff'}
                  </p>
                  <p className="text-xs text-[#90a8cb]">Profile menu</p>
                </div>
                <ChevronUp
                  className={cn(
                    'h-4 w-4 shrink-0 text-[#90a8cb] transition',
                    profileMenuOpen ? 'rotate-0' : 'rotate-180'
                  )}
                />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-h-screen lg:flex lg:min-w-0 lg:h-screen lg:flex-col lg:overflow-visible">
          {shellContent}
        </div>
      </div>
      {sidebarOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  )
}
