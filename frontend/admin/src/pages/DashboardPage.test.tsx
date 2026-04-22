import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'

import { AuthProvider } from '@shared/auth/AuthProvider'

import { buildAuthMe, createMockAuthClient } from '../../../tests/utils/auth'
import { AdminShellProvider } from '../components/layout/AdminShellProvider'
import { AdminDashboardPage } from './DashboardPage'

vi.mock('recharts', () => {
  function passthrough({ children }: { children?: ReactNode }) {
    return <div>{children}</div>
  }

  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    CartesianGrid: () => null,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Bar: () => null,
  }
})

test('admin dashboard does not load paginated applications or listings on mount', async () => {
  const requestPaths: string[] = []
  const { client, spies } = createMockAuthClient({
    authMe: buildAuthMe({ role: 'staff' }),
    requestTwaImpl: async (path) => {
      requestPaths.push(path)

      if (path === '/api/v1/admin/dashboard') {
        return {
          pending_employers: 2,
          pending_listings: 3,
          active_jobseekers: 12,
          open_applications: 7,
          open_listings: 5,
          placement_summary: {
            rows: [
              {
                month: '2026-03-01T00:00:00Z',
                applications: 4,
                hires: 1,
              },
              {
                month: '2026-02-01T00:00:00Z',
                applications: 2,
                hires: 1,
              },
            ],
            ytd_applications: 6,
            ytd_hires: 2,
            ytd_employers: 2,
          },
        }
      }

      if (path.startsWith('/api/v1/admin/audit-log')) {
        return {
          items: [
            {
              id: 'audit-1',
              actor_id: null,
              action: 'gtfs_feed_refreshed',
              entity_type: 'system',
              entity_id: null,
              old_value: null,
              new_value: { listings_recomputed: 3 },
              timestamp: '2026-03-10T12:00:00Z',
            },
          ],
          meta: {
            page: 1,
            page_size: 5,
            total_items: 1,
            total_pages: 1,
          },
        }
      }

      if (path.startsWith('/api/v1/notifications/me')) {
        return {
          items: [],
          meta: {
            page: 1,
            page_size: 8,
            total_items: 0,
            total_pages: 0,
          },
        }
      }

      throw new Error(`Unexpected TWA request for ${path}`)
    },
  })

  render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <AdminShellProvider>
          <AdminDashboardPage />
        </AdminShellProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  expect(await screen.findByText('Recent Activity')).toBeInTheDocument()
  expect(await screen.findByText('6 total applications')).toBeInTheDocument()
  expect(screen.getByText('2 placements')).toBeInTheDocument()
  expect(screen.getByText(/across 2 employers/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(requestPaths).toContain('/api/v1/admin/dashboard')
    expect(
      requestPaths.some((path) => path.startsWith('/api/v1/admin/audit-log'))
    ).toBe(true)
  })

  expect(
    requestPaths.some((path) => path.startsWith('/api/v1/admin/applications'))
  ).toBe(false)
  expect(
    requestPaths.some((path) => path.startsWith('/api/v1/admin/listings'))
  ).toBe(false)
  expect(spies.requestTwa).not.toHaveBeenCalledWith(
    expect.stringMatching(/^\/api\/v1\/admin\/applications/),
    expect.anything(),
    expect.anything()
  )
  expect(spies.requestTwa).not.toHaveBeenCalledWith(
    expect.stringMatching(/^\/api\/v1\/admin\/listings/),
    expect.anything(),
    expect.anything()
  )
})
