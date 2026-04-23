import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../../tests/utils/auth'
import { AdminWorkspaceLayout } from './AdminWorkspaceLayout'
import { AdminShellProvider } from './AdminShellProvider'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

function createDashboardResponse(openApplications = 0) {
  return {
    pending_employers: 0,
    pending_listings: 0,
    active_jobseekers: 0,
    open_applications: openApplications,
    open_listings: 0,
    placement_summary: {
      rows: [],
      ytd_applications: 0,
      ytd_hires: 0,
      ytd_employers: 0,
    },
  }
}

function createNotificationListResponse(items: Array<Record<string, unknown>>) {
  return {
    items,
    meta: {
      page: 1,
      page_size: 8,
      total_items: items.length,
      total_pages: items.length > 0 ? 1 : 0,
    },
  }
}

function createNotificationEventStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(nextController) {
      controller = nextController
    },
  })

  return {
    response: new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    }),
    push(event: string, payload: Record<string, unknown>) {
      controller?.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
      )
    },
    close() {
      controller?.close()
    },
  }
}

function TestPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return <AdminWorkspaceLayout title={title}>{children}</AdminWorkspaceLayout>
}

function TestRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={<TestPage title="Dashboard">Dashboard view</TestPage>}
      />
      <Route
        path="/applications"
        element={<TestPage title="Applications">Applications view</TestPage>}
      />
      <Route
        path="/notifications"
        element={<TestPage title="Notifications">Notifications view</TestPage>}
      />
      <Route
        path="/employers/queue"
        element={<TestPage title="Employer Queue">Employer queue view</TestPage>}
      />
      <Route
        path="/listings/queue"
        element={<TestPage title="Listing Queue">Listing queue view</TestPage>}
      />
    </Routes>
  )
}

test('admin shell keeps the bell badge in sync across live updates and navigation without mirroring it in the nav', async () => {
  const user = userEvent.setup()
  const stream = createNotificationEventStream()
  let dashboardRequests = 0
  let notificationRequests = 0

  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        dashboardRequests += 1
        return createDashboardResponse(dashboardRequests >= 2 ? 4 : 0)
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        notificationRequests += 1
        return createNotificationListResponse([])
      }

      throw new Error(`Unexpected path ${path}`)
    },
  })
  spies.streamTwa.mockResolvedValue(stream.response)

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <TestRoutes />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Dashboard view')).toBeInTheDocument()

  await waitFor(() => {
    expect(dashboardRequests).toBe(1)
    expect(notificationRequests).toBe(1)
    expect(spies.streamTwa).toHaveBeenCalledTimes(1)
  })

  stream.push('notification.created', {
    notification: {
      id: 'notification-1',
      type: 'application_submitted',
      channel: 'in_app',
      title: 'New application received',
      body: 'A new application was submitted.',
      read_at: null,
      created_at: '2026-04-22T12:34:56.000Z',
      target: {
        kind: 'admin_route',
        href: '/applications',
        entity_id: null,
      },
    },
  })

  await waitFor(() => {
    expect(dashboardRequests).toBe(2)
  })

  const applicationsLink = screen.getByRole('link', {
    name: /application tracker/i,
  })

  const notificationsLink = screen.getByRole('link', {
    name: /notification config/i,
  })
  expect(within(notificationsLink).queryByText('1')).not.toBeInTheDocument()
  expect(within(applicationsLink).getByText('4')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /notifications/i }))
  expect(await screen.findByText('New application received')).toBeInTheDocument()
  expect(screen.getByText('1 unread item')).toBeInTheDocument()

  await user.click(applicationsLink)
  expect(await screen.findByText('Applications view')).toBeInTheDocument()
  expect(notificationRequests).toBe(1)
  expect(spies.streamTwa).toHaveBeenCalledTimes(1)

  await user.click(screen.getByRole('button', { name: /notifications/i }))
  expect(await screen.findByText('New application received')).toBeInTheDocument()

  stream.push('notification.read', {
    notification: {
      id: 'notification-1',
      read_at: '2026-04-22T13:00:00.000Z',
    },
  })

  await waitFor(() => {
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })
  expect(dashboardRequests).toBe(2)
})

test('admin shell coalesces summary refreshes triggered by live notifications', async () => {
  const stream = createNotificationEventStream()
  const secondSummary = createDeferred<ReturnType<typeof createDashboardResponse>>()
  let dashboardRequests = 0

  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        dashboardRequests += 1
        if (dashboardRequests === 1) return createDashboardResponse(0)
        if (dashboardRequests === 2) return secondSummary.promise
        if (dashboardRequests === 3) return createDashboardResponse(7)
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return createNotificationListResponse([])
      }

      throw new Error(`Unexpected path ${path}`)
    },
  })
  spies.streamTwa.mockResolvedValue(stream.response)

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <TestRoutes />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Dashboard view')).toBeInTheDocument()

  await waitFor(() => {
    expect(dashboardRequests).toBe(1)
  })

  stream.push('notification.created', {
    notification: {
      id: 'notification-1',
      type: 'application_submitted',
      channel: 'in_app',
      title: 'New application received',
      body: 'First update.',
      read_at: null,
      created_at: '2026-04-22T12:34:56.000Z',
      target: {
        kind: 'admin_route',
        href: '/applications',
        entity_id: null,
      },
    },
  })

  await waitFor(() => {
    expect(dashboardRequests).toBe(2)
  })

  stream.push('notification.created', {
    notification: {
      id: 'notification-2',
      type: 'listing_review_requested',
      channel: 'in_app',
      title: 'Listing awaiting review',
      body: 'Second update.',
      read_at: null,
      created_at: '2026-04-22T12:35:00.000Z',
      target: {
        kind: 'admin_route',
        href: '/listings/queue',
        entity_id: null,
      },
    },
  })

  secondSummary.resolve(createDashboardResponse(5))

  await waitFor(() => {
    expect(dashboardRequests).toBe(3)
  })

  await waitFor(() => {
    const applicationsLink = screen.getByRole('link', {
      name: /application tracker/i,
    })
    expect(within(applicationsLink).getByText('7')).toBeInTheDocument()
  })

  await waitFor(() => {
    expect(dashboardRequests).toBe(3)
  })
})

test('bell notifications mark themselves read when clicked and navigate to their source route', async () => {
  const user = userEvent.setup()
  let markReadRequests = 0
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path, init) => {
      if (path === '/api/v1/admin/dashboard') {
        return createDashboardResponse()
      }

      if (path === '/api/v1/notifications/me/notification-1/read') {
        markReadRequests += 1
        expect(init?.method).toBe('PATCH')
        return {
          notification: {
            id: 'notification-1',
            read_at: '2026-04-22T13:00:00.000Z',
          },
        }
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return createNotificationListResponse([
          {
            id: 'notification-1',
            type: 'employer_review_requested',
            channel: 'in_app',
            title: 'Employer awaiting review',
            body: 'Northside Logistics is awaiting review.',
            read_at: null,
            created_at: '2026-04-22T12:34:56.000Z',
            target: {
              kind: 'admin_route',
              href: '/employers/queue',
              entity_id: null,
            },
          },
        ])
      }

      throw new Error(`Unexpected path ${path}`)
    },
  })

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <TestRoutes />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Dashboard view')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /notifications/i }))

  const notificationButton = await screen.findByRole('button', {
    name: /open notification employer awaiting review/i,
  })
  await user.click(notificationButton)

  await waitFor(() => {
    expect(markReadRequests).toBe(1)
  })
  expect(spies.requestTwa).toHaveBeenCalledWith(
    '/api/v1/notifications/me/notification-1/read',
    expect.any(Object),
    expect.objectContaining({ method: 'PATCH' })
  )
  expect(await screen.findByText('Employer queue view')).toBeInTheDocument()
  expect(
    screen.queryByText('1 unread item', { selector: 'p' })
  ).not.toBeInTheDocument()
})

test('bell notifications with malformed targets remain readable and non-clickable', async () => {
  const user = userEvent.setup()
  const { client } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        return createDashboardResponse()
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return createNotificationListResponse([
          {
            id: 'notification-1',
            type: 'application_submitted',
            channel: 'in_app',
            title: 'New application received',
            body: 'A jobseeker applied.',
            read_at: null,
            created_at: '2026-04-22T12:34:56.000Z',
            target: {
              kind: 42,
              href: '/applications',
            },
          },
        ])
      }

      throw new Error(`Unexpected path ${path}`)
    },
  })

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <TestRoutes />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Dashboard view')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /notifications/i }))

  expect(await screen.findByText('New application received')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', {
      name: /open notification new application received/i,
    })
  ).not.toBeInTheDocument()
})
