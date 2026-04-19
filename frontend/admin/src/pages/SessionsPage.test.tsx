import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'
import { AdminSessionsPage } from './SessionsPage'

function createIdleStreamResponse() {
  return new Response(
    new ReadableStream<Uint8Array>({
      start() {},
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    }
  )
}

test(
  'staff can search auth users, inspect suspicious sessions, and revoke a session through step-up verification',
  async () => {
  const user = userEvent.setup()
  let sessions = [
    {
      session_id: 'session-1',
      user_id: 'user-1',
      created_at: '2026-04-17T09:00:00Z',
      last_seen_at: '2026-04-17T10:15:00Z',
      expires_at: '2026-04-24T09:00:00Z',
      revoked_at: null,
      revoke_reason: null,
      ip_address: '203.0.113.10',
      user_agent: 'Mozilla/5.0',
      device_label: 'Chrome on Windows',
      is_suspicious: true,
      suspicious_reasons: ['new_ip', 'prior_failures'],
    },
    {
      session_id: 'session-2',
      user_id: 'user-1',
      created_at: '2026-04-16T11:00:00Z',
      last_seen_at: '2026-04-17T08:45:00Z',
      expires_at: '2026-04-23T11:00:00Z',
      revoked_at: null,
      revoke_reason: null,
      ip_address: '198.51.100.2',
      user_agent: 'Mozilla/5.0',
      device_label: 'Safari on macOS',
      is_suspicious: false,
      suspicious_reasons: [],
    },
  ]

  const { client, spies } = createMockAuthClient({
    portal: 'staff',
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      if (path === '/api/v1/admin/dashboard') {
        return {
          pending_employers: 1,
          pending_listings: 2,
          active_jobseekers: 3,
          open_applications: 4,
          open_listings: 5,
        }
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return {
          items: [],
          meta: { page: 1, page_size: 8, total_items: 0, total_pages: 0 },
        }
      }

      throw new Error(`Unexpected TWA path ${path}`)
    },
    requestAuthImpl: async (path, init) => {
      if (path.startsWith('/admin/users?')) {
        return {
          data: [
            {
              id: 'user-1',
              email: 'jobseeker@example.com',
              role: 'user',
              is_active: true,
              email_verified: true,
              email_otp_enabled: true,
              locked: false,
              lock_retry_after: null,
              created_at: '2026-04-01T09:00:00Z',
              updated_at: '2026-04-17T09:00:00Z',
            },
          ],
          next_cursor: null,
          has_more: false,
        }
      }

      if (path === '/admin/users/user-1') {
        return {
          id: 'user-1',
          email: 'jobseeker@example.com',
          role: 'user',
          is_active: true,
          email_verified: true,
          email_otp_enabled: true,
          locked: false,
          lock_retry_after: null,
          created_at: '2026-04-01T09:00:00Z',
          updated_at: '2026-04-17T09:00:00Z',
          active_session_count: sessions.filter((item) => !item.revoked_at).length,
        }
      }

      if (path.startsWith('/admin/users/user-1/sessions?')) {
        return {
          data: sessions,
          next_cursor: null,
          has_more: false,
        }
      }

      if (path === '/admin/users/user-1/sessions/session-1?timeline_limit=20') {
        return {
          ...sessions[0],
          timeline: [
            {
              event_type: 'user.login.suspicious',
              success: true,
              metadata: { provider: 'password', reason: 'new_ip' },
              created_at: '2026-04-17T09:00:00Z',
            },
            {
              event_type: 'session.created',
              success: true,
              metadata: { provider: 'password' },
              created_at: '2026-04-17T09:00:00Z',
            },
          ],
        }
      }

      if (path === '/auth/otp/request/action') {
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe(JSON.stringify({ action: 'revoke_sessions' }))
        return {
          sent: true,
          action: 'revoke_sessions',
          expires_in: 300,
        }
      }

      if (path === '/auth/otp/verify/action') {
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe(
          JSON.stringify({ action: 'revoke_sessions', code: '123456' })
        )
        return {
          action_token: 'step-up-token',
        }
      }

      if (path === '/admin/users/user-1/sessions/session-1') {
        expect(init?.method).toBe('DELETE')
        const headers = new Headers(init?.headers)
        expect(headers.get('X-Action-Token')).toBe('step-up-token')
        expect(init?.body).toBe(
          JSON.stringify({ reason: 'compromised_device' })
        )
        sessions = sessions.map((item) =>
          item.session_id === 'session-1'
            ? {
                ...item,
                revoked_at: '2026-04-17T11:30:00Z',
                revoke_reason: 'compromised_device',
              }
            : item
        )
        return {
          user_id: 'user-1',
          session_id: 'session-1',
          revoke_reason: 'compromised_device',
        }
      }

      throw new Error(`Unexpected auth path ${path}`)
    },
    streamTwaImpl: async () => createIdleStreamResponse(),
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminSessionsPage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('jobseeker@example.com')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Manage sessions' }))

  expect(await screen.findByText('Security summary')).toBeInTheDocument()
  expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()
  expect(screen.getAllByText('Suspicious').length).toBeGreaterThan(0)

  await user.click(
    screen.getByRole('button', {
      name: 'Inspect session Chrome on Windows',
    })
  )

  const detailDialog = await screen.findByRole('dialog', {
    name: 'Session detail',
  })
  expect(
    within(detailDialog).getByText('User Login Suspicious')
  ).toBeInTheDocument()
  await user.click(within(detailDialog).getByRole('button', { name: 'Close' }))

  await user.click(
    screen.getByRole('button', {
      name: 'Revoke session Chrome on Windows',
    })
  )

  const revokeDialog = await screen.findByRole('dialog', {
    name: 'Verify revoke action',
  })
  await user.type(
    within(revokeDialog).getByLabelText('Revoke reason'),
    'compromised_device'
  )
  await user.click(
    within(revokeDialog).getByRole('button', { name: 'Send verification code' })
  )

  expect(
    await within(revokeDialog).findByText('A verification code was sent to your email.')
  ).toBeInTheDocument()

  await user.type(
    within(revokeDialog).getByLabelText('One-time code'),
    '123456'
  )
  await user.click(
    within(revokeDialog).getByRole('button', { name: 'Confirm revoke' })
  )

  await waitFor(() => {
    expect(screen.getByText('Session revoked successfully.')).toBeInTheDocument()
  })
  expect(screen.getByText('compromised_device')).toBeInTheDocument()
  expect(
    spies.requestAuth
  ).toHaveBeenCalledWith(
    '/admin/users/user-1/sessions/session-1',
    expect.anything(),
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ reason: 'compromised_device' }),
    })
  )
  },
  10000
)

test(
  'staff can preview and execute a filter-based revoke sweep through separate step-up confirmations',
  async () => {
    const user = userEvent.setup()
    let sessions = [
      {
        session_id: 'session-1',
        user_id: 'user-1',
        created_at: '2026-04-17T09:00:00Z',
        last_seen_at: '2026-04-17T10:15:00Z',
        expires_at: '2026-04-24T09:00:00Z',
        revoked_at: null,
        revoke_reason: null,
        ip_address: '203.0.113.10',
        user_agent: 'Mozilla/5.0',
        device_label: 'Chrome on Windows',
        is_suspicious: true,
        suspicious_reasons: ['new_ip'],
      },
      {
        session_id: 'session-2',
        user_id: 'user-1',
        created_at: '2026-04-16T11:00:00Z',
        last_seen_at: '2026-04-17T08:45:00Z',
        expires_at: '2026-04-23T11:00:00Z',
        revoked_at: null,
        revoke_reason: null,
        ip_address: '198.51.100.2',
        user_agent: 'Mozilla/5.0',
        device_label: 'Safari on macOS',
        is_suspicious: false,
        suspicious_reasons: [],
      },
    ]
    let actionVerificationCount = 0

    const { client, spies } = createMockAuthClient({
      portal: 'staff',
      authMe: buildAuthMe({ role: 'staff' }),
      requestTwaImpl: async (path) => {
        if (path === '/api/v1/admin/dashboard') {
          return {
            pending_employers: 1,
            pending_listings: 2,
            active_jobseekers: 3,
            open_applications: 4,
            open_listings: 5,
          }
        }

        if (path.startsWith('/api/v1/notifications/me')) {
          return {
            items: [],
            meta: { page: 1, page_size: 8, total_items: 0, total_pages: 0 },
          }
        }

        throw new Error(`Unexpected TWA path ${path}`)
      },
      requestAuthImpl: async (path, init) => {
        if (path.startsWith('/admin/users?')) {
          return {
            data: [
              {
                id: 'user-1',
                email: 'jobseeker@example.com',
                role: 'user',
                is_active: true,
                email_verified: true,
                email_otp_enabled: true,
                locked: false,
                lock_retry_after: null,
                created_at: '2026-04-01T09:00:00Z',
                updated_at: '2026-04-17T09:00:00Z',
              },
            ],
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-1') {
          return {
            id: 'user-1',
            email: 'jobseeker@example.com',
            role: 'user',
            is_active: true,
            email_verified: true,
            email_otp_enabled: true,
            locked: false,
            lock_retry_after: null,
            created_at: '2026-04-01T09:00:00Z',
            updated_at: '2026-04-17T09:00:00Z',
            active_session_count: sessions.filter((item) => !item.revoked_at).length,
          }
        }

        if (path.startsWith('/admin/users/user-1/sessions?')) {
          return {
            data: sessions,
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/auth/otp/request/action') {
          expect(init?.method).toBe('POST')
          return {
            sent: true,
            action: 'revoke_sessions',
            expires_in: 300,
          }
        }

        if (path === '/auth/otp/verify/action') {
          actionVerificationCount += 1
          const expectedCode =
            actionVerificationCount === 1 ? '111111' : '222222'
          expect(init?.body).toBe(
            JSON.stringify({ action: 'revoke_sessions', code: expectedCode })
          )
          return {
            action_token: `step-up-token-${actionVerificationCount}`,
          }
        }

        if (path === '/admin/users/user-1/sessions/revoke-by-filter') {
          expect(init?.method).toBe('POST')
          const headers = new Headers(init?.headers)
          const payload = JSON.parse(String(init?.body)) as Record<string, unknown>

          if (payload.dry_run === true) {
            expect(headers.get('X-Action-Token')).toBe('step-up-token-1')
            expect(payload).toEqual({
              is_suspicious: true,
              dry_run: true,
              reason: 'risk_sweep',
            })
            return {
              user_id: 'user-1',
              matched_session_ids: ['session-1'],
              matched_session_count: 1,
              revoked_session_ids: [],
              revoked_session_count: 0,
              dry_run: true,
              revoke_reason: 'risk_sweep',
            }
          }

          expect(headers.get('X-Action-Token')).toBe('step-up-token-2')
          expect(payload).toEqual({
            is_suspicious: true,
            reason: 'risk_sweep',
          })
          sessions = sessions.map((item) =>
            item.session_id === 'session-1'
              ? {
                  ...item,
                  revoked_at: '2026-04-17T11:45:00Z',
                  revoke_reason: 'risk_sweep',
                }
              : item
          )
          return {
            user_id: 'user-1',
            matched_session_ids: ['session-1'],
            matched_session_count: 1,
            revoked_session_ids: ['session-1'],
            revoked_session_count: 1,
            dry_run: false,
            revoke_reason: 'risk_sweep',
          }
        }

        throw new Error(`Unexpected auth path ${path}`)
      },
      streamTwaImpl: async () => createIdleStreamResponse(),
    })

    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <AdminShellProvider>
            <AdminSessionsPage />
          </AdminShellProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(await screen.findByText('jobseeker@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Manage sessions' }))
    expect(await screen.findByText('Security summary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open filter sweep' }))

    const filterDialog = await screen.findByRole('dialog', {
      name: 'Filter sweep builder',
    })
    await user.click(
      within(filterDialog).getByRole('checkbox', {
        name: 'Suspicious sessions only',
      })
    )
    await user.type(
      within(filterDialog).getByLabelText('Revoke reason for sweep'),
      'risk_sweep'
    )
    await user.click(
      within(filterDialog).getByRole('button', { name: 'Preview matches' })
    )

    const verifyPreviewDialog = await screen.findByRole('dialog', {
      name: 'Verify revoke action',
    })
    await user.click(
      within(verifyPreviewDialog).getByRole('button', {
        name: 'Send verification code',
      })
    )
    await user.type(
      within(verifyPreviewDialog).getByLabelText('One-time code'),
      '111111'
    )
    await user.click(
      within(verifyPreviewDialog).getByRole('button', { name: 'Confirm preview' })
    )

    expect(
      await within(filterDialog).findByText('Preview matched 1 session.')
    ).toBeInTheDocument()
    expect(within(filterDialog).getByText('session-1')).toBeInTheDocument()

    await user.click(
      within(filterDialog).getByRole('button', { name: 'Execute revoke sweep' })
    )

    const verifyExecuteDialog = await screen.findByRole('dialog', {
      name: 'Verify revoke action',
    })
    await user.click(
      within(verifyExecuteDialog).getByRole('button', {
        name: 'Send verification code',
      })
    )
    await user.type(
      within(verifyExecuteDialog).getByLabelText('One-time code'),
      '222222'
    )
    await user.click(
      within(verifyExecuteDialog).getByRole('button', { name: 'Confirm revoke' })
    )

    await waitFor(() => {
      expect(
        screen.getByText('Revoked 1 filtered session.')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('risk_sweep')).toBeInTheDocument()
    expect(spies.requestAuth).toHaveBeenCalledWith(
      '/admin/users/user-1/sessions/revoke-by-filter',
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
      })
    )
  },
  12000
)

test(
  'staff can load the global suspicious queue, page through it, filter it, and drill into another user workspace',
  async () => {
    const user = userEvent.setup()
    const sessionsByUser = {
      'user-1': [
        {
          session_id: 'session-1',
          user_id: 'user-1',
          created_at: '2026-04-17T09:00:00Z',
          last_seen_at: '2026-04-17T10:15:00Z',
          expires_at: '2026-04-24T09:00:00Z',
          revoked_at: null,
          revoke_reason: null,
          ip_address: '203.0.113.10',
          user_agent: 'Mozilla/5.0',
          device_label: 'Chrome on Windows',
          is_suspicious: true,
          suspicious_reasons: ['new_ip'],
        },
        {
          session_id: 'session-2',
          user_id: 'user-1',
          created_at: '2026-04-16T11:00:00Z',
          last_seen_at: '2026-04-17T08:45:00Z',
          expires_at: '2026-04-23T11:00:00Z',
          revoked_at: null,
          revoke_reason: null,
          ip_address: '198.51.100.2',
          user_agent: 'Mozilla/5.0',
          device_label: 'Safari on macOS',
          is_suspicious: false,
          suspicious_reasons: [],
        },
      ],
      'user-2': [
        {
          session_id: 'session-9',
          user_id: 'user-2',
          created_at: '2026-04-17T07:30:00Z',
          last_seen_at: '2026-04-17T11:45:00Z',
          expires_at: '2026-04-24T07:30:00Z',
          revoked_at: null,
          revoke_reason: null,
          ip_address: '192.0.2.44',
          user_agent: 'Mozilla/5.0',
          device_label: 'Firefox on Linux',
          is_suspicious: true,
          suspicious_reasons: ['new_user_agent'],
        },
      ],
    } satisfies Record<string, Array<Record<string, unknown>>>

    const { client } = createMockAuthClient({
      portal: 'staff',
      authMe: buildAuthMe({ role: 'staff' }),
      requestTwaImpl: async (path) => {
        if (path === '/api/v1/admin/dashboard') {
          return {
            pending_employers: 1,
            pending_listings: 2,
            active_jobseekers: 3,
            open_applications: 4,
            open_listings: 5,
          }
        }

        if (path.startsWith('/api/v1/notifications/me')) {
          return {
            items: [],
            meta: { page: 1, page_size: 8, total_items: 0, total_pages: 0 },
          }
        }

        throw new Error(`Unexpected TWA path ${path}`)
      },
      requestAuthImpl: async (path) => {
        if (path.startsWith('/admin/users?')) {
          return {
            data: [
              {
                id: 'user-1',
                email: 'jobseeker@example.com',
                role: 'user',
                is_active: true,
                email_verified: true,
                email_otp_enabled: true,
                locked: false,
                lock_retry_after: null,
                created_at: '2026-04-01T09:00:00Z',
                updated_at: '2026-04-17T09:00:00Z',
              },
              {
                id: 'user-2',
                email: 'employer@example.com',
                role: 'admin',
                is_active: true,
                email_verified: true,
                email_otp_enabled: true,
                locked: false,
                lock_retry_after: null,
                created_at: '2026-04-03T09:00:00Z',
                updated_at: '2026-04-17T12:00:00Z',
              },
            ],
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-1') {
          return {
            id: 'user-1',
            email: 'jobseeker@example.com',
            role: 'user',
            is_active: true,
            email_verified: true,
            email_otp_enabled: true,
            locked: false,
            lock_retry_after: null,
            created_at: '2026-04-01T09:00:00Z',
            updated_at: '2026-04-17T09:00:00Z',
            active_session_count: sessionsByUser['user-1'].length,
          }
        }

        if (path === '/admin/users/user-2') {
          return {
            id: 'user-2',
            email: 'employer@example.com',
            role: 'admin',
            is_active: true,
            email_verified: true,
            email_otp_enabled: true,
            locked: false,
            lock_retry_after: null,
            created_at: '2026-04-03T09:00:00Z',
            updated_at: '2026-04-17T12:00:00Z',
            active_session_count: sessionsByUser['user-2'].length,
          }
        }

        if (path === '/admin/sessions/suspicious?limit=50') {
          return {
            data: [
              {
                ...sessionsByUser['user-1'][0],
                user_email: 'jobseeker@example.com',
                user_role: 'user',
              },
            ],
            next_cursor: 'queue-cursor-1',
            has_more: true,
          }
        }

        if (path === '/admin/sessions/suspicious?cursor=queue-cursor-1&limit=50') {
          return {
            data: [
              {
                ...sessionsByUser['user-2'][0],
                user_email: 'employer@example.com',
                user_role: 'admin',
              },
            ],
            next_cursor: null,
            has_more: false,
          }
        }

        if (path.startsWith('/admin/users/user-1/sessions?')) {
          return {
            data: sessionsByUser['user-1'],
            next_cursor: null,
            has_more: false,
          }
        }

        if (path.startsWith('/admin/users/user-2/sessions?')) {
          return {
            data: sessionsByUser['user-2'],
            next_cursor: null,
            has_more: false,
          }
        }

        throw new Error(`Unexpected auth path ${path}`)
      },
      streamTwaImpl: async () => createIdleStreamResponse(),
    })

    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <AdminShellProvider>
            <AdminSessionsPage />
          </AdminShellProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(await screen.findByText('jobseeker@example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load suspicious queue' }))

    const queueHeading = await screen.findByRole('heading', {
      name: 'Suspicious session queue',
    })
    const queuePanel = queueHeading.closest('section')
    expect(queuePanel).not.toBeNull()
    const queue = within(queuePanel as HTMLElement)

    expect(await queue.findByText('jobseeker@example.com')).toBeInTheDocument()

    await user.click(
      queue.getByRole('button', { name: 'Load more suspicious sessions' })
    )

    expect(
      await queue.findByText('2 suspicious sessions across 2 users.')
    ).toBeInTheDocument()
    expect(queue.getByText('jobseeker@example.com')).toBeInTheDocument()
    expect(queue.getByText('employer@example.com')).toBeInTheDocument()

    await user.type(queue.getByLabelText('Filter suspicious queue'), 'employer')

    expect(queue.getByText('employer@example.com')).toBeInTheDocument()
    expect(queue.queryByText('jobseeker@example.com')).not.toBeInTheDocument()

    await user.click(
      queue.getByRole('button', { name: 'Open workspace employer@example.com' })
    )

    expect(
      await screen.findByRole('heading', { name: 'employer@example.com' })
    ).toBeInTheDocument()
    expect((await screen.findAllByText('Firefox on Linux')).length).toBeGreaterThan(0)
  },
  12000
)

test(
  'directory searches reconcile the workspace to the returned user and reset per-user session filters',
  async () => {
    const user = userEvent.setup()

    const users = [
      {
        id: 'user-1',
        email: 'jobseeker@example.com',
        role: 'user',
        is_active: true,
        email_verified: true,
        email_otp_enabled: true,
        locked: false,
        lock_retry_after: null,
        created_at: '2026-04-01T09:00:00Z',
        updated_at: '2026-04-17T09:00:00Z',
      },
      {
        id: 'user-2',
        email: 'employer@example.com',
        role: 'admin',
        is_active: true,
        email_verified: true,
        email_otp_enabled: true,
        locked: false,
        lock_retry_after: null,
        created_at: '2026-04-03T09:00:00Z',
        updated_at: '2026-04-17T12:00:00Z',
      },
    ]

    const sessionsByUser = {
      'user-1': {
        active: [
          {
            session_id: 'session-1',
            user_id: 'user-1',
            created_at: '2026-04-17T09:00:00Z',
            last_seen_at: '2026-04-17T10:15:00Z',
            expires_at: '2026-04-24T09:00:00Z',
            revoked_at: null,
            revoke_reason: null,
            ip_address: '203.0.113.10',
            user_agent: 'Mozilla/5.0',
            device_label: 'Chrome on Windows',
            is_suspicious: false,
            suspicious_reasons: [],
          },
        ],
        revoked: [
          {
            session_id: 'session-1-r',
            user_id: 'user-1',
            created_at: '2026-04-16T09:00:00Z',
            last_seen_at: '2026-04-16T10:15:00Z',
            expires_at: '2026-04-24T09:00:00Z',
            revoked_at: '2026-04-17T12:00:00Z',
            revoke_reason: 'previous_revoke',
            ip_address: '203.0.113.10',
            user_agent: 'Mozilla/5.0',
            device_label: 'Revoked Chrome on Windows',
            is_suspicious: false,
            suspicious_reasons: [],
          },
        ],
      },
      'user-2': {
        active: [
          {
            session_id: 'session-2',
            user_id: 'user-2',
            created_at: '2026-04-17T07:30:00Z',
            last_seen_at: '2026-04-17T11:45:00Z',
            expires_at: '2026-04-24T07:30:00Z',
            revoked_at: null,
            revoke_reason: null,
            ip_address: '192.0.2.44',
            user_agent: 'Mozilla/5.0',
            device_label: 'Firefox on Linux',
            is_suspicious: false,
            suspicious_reasons: [],
          },
        ],
        revoked: [],
      },
    } satisfies Record<string, { active: Array<Record<string, unknown>>; revoked: Array<Record<string, unknown>> }>

    const { client } = createMockAuthClient({
      portal: 'staff',
      authMe: buildAuthMe({ role: 'staff' }),
      requestTwaImpl: async (path) => {
        if (path === '/api/v1/admin/dashboard') {
          return {
            pending_employers: 1,
            pending_listings: 2,
            active_jobseekers: 3,
            open_applications: 4,
            open_listings: 5,
          }
        }

        if (path.startsWith('/api/v1/notifications/me')) {
          return {
            items: [],
            meta: { page: 1, page_size: 8, total_items: 0, total_pages: 0 },
          }
        }

        throw new Error(`Unexpected TWA path ${path}`)
      },
      requestAuthImpl: async (path) => {
        if (path === '/admin/users?limit=12') {
          return {
            data: users,
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users?email=employer%40example.com&limit=12') {
          return {
            data: [users[1]],
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-1') {
          return {
            ...users[0],
            active_session_count: sessionsByUser['user-1'].active.length,
          }
        }

        if (path === '/admin/users/user-2') {
          return {
            ...users[1],
            active_session_count: sessionsByUser['user-2'].active.length,
          }
        }

        if (path === '/admin/users/user-1/sessions?status=active&limit=50') {
          return {
            data: sessionsByUser['user-1'].active,
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-1/sessions?status=revoked&limit=50') {
          return {
            data: sessionsByUser['user-1'].revoked,
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-2/sessions?status=active&limit=50') {
          return {
            data: sessionsByUser['user-2'].active,
            next_cursor: null,
            has_more: false,
          }
        }

        if (path === '/admin/users/user-2/sessions?status=revoked&limit=50') {
          return {
            data: sessionsByUser['user-2'].revoked,
            next_cursor: null,
            has_more: false,
          }
        }

        throw new Error(`Unexpected auth path ${path}`)
      },
      streamTwaImpl: async () => createIdleStreamResponse(),
    })

    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <AdminShellProvider>
            <AdminSessionsPage />
          </AdminShellProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(await screen.findByText('jobseeker@example.com')).toBeInTheDocument()

    await user.click(
      screen.getAllByRole('button', { name: 'Manage sessions' })[0]
    )

    expect(
      await screen.findByRole('heading', { name: 'jobseeker@example.com' })
    ).toBeInTheDocument()
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText('Session status filter'),
      'revoked'
    )
    expect(
      await screen.findByText('Revoked Chrome on Windows')
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search sessions'), 'stale-search')
    expect(screen.getByLabelText('Search sessions')).toHaveValue('stale-search')

    await user.type(
      screen.getByLabelText('Filter by email'),
      'employer@example.com'
    )

    expect(screen.getAllByText('jobseeker@example.com').length).toBeGreaterThan(0)
    expect(screen.getAllByText('employer@example.com').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByRole('heading', { name: 'employer@example.com' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Session status filter')).toHaveValue('active')
    expect(screen.getByLabelText('Search sessions')).toHaveValue('')
    expect(screen.getByText('Firefox on Linux')).toBeInTheDocument()
    expect(screen.queryByText('Revoked Chrome on Windows')).not.toBeInTheDocument()
  },
  12000
)
