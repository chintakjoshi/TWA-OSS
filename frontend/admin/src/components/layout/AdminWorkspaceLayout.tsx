import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, Menu, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { announceComingSoon } from '../../lib/comingSoon'
import { cn } from '../../lib/cn'
import { useAdminShell } from './AdminShellProvider'
import { adminNavItems } from './adminNav'
import { AdminButton, StatusBadge } from '../ui/AdminUi'

function isItemActive(pathname: string, href: string, activePrefixes?: string[]) {
  if (activePrefixes?.some((prefix) => pathname.startsWith(prefix))) return true
  if (href === '/dashboard') return pathname === href
  return pathname === href
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
  const { summary } = useAdminShell()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sections = useMemo(
    () =>
      sectionOrder.map(([key, label]) => ({
        key,
        label,
        items: adminNavItems.filter((item) => item.section === key),
      })),
    []
  )

  const shellContent = (
    <>
      <div className="border-b border-[#ddcfba] bg-white/85 px-4 py-4 backdrop-blur sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ddcfba] bg-white text-slate-700 lg:hidden"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="admin-display text-[1.9rem] leading-none font-semibold text-slate-950">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton
              icon={Bell}
              variant="secondary"
              onClick={() =>
                toast.success('No new notifications.', {
                  description:
                    'The staff notification center is quiet right now.',
                })
              }
            >
              <span className="sr-only">Notifications</span>
            </AdminButton>
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

      <main className="min-h-[calc(100vh-85px)] px-4 py-7 sm:px-7">{children}</main>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f7f1e5] text-slate-800">
      <div className="lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[252px] border-r border-[#1f3145] bg-[#132130] text-white transition lg:static lg:block',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/7 px-5 py-7">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d99a2b] text-lg font-semibold text-white">
                  T
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">TWA</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#9db6d8]">
                    Transformative Workforce Academy
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="mb-6 rounded-xl border border-[#7d6336] bg-[#2c2f2d] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffbd52]">
                Staff Admin Panel
              </div>

              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.key} className="space-y-2">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7e98be]">
                      {section.label}
                    </p>
                    <nav className="space-y-1.5">
                      {section.items.map((item) => {
                        const active = isItemActive(
                          location.pathname,
                          item.href,
                          item.activePrefixes
                        )
                        const Icon = item.icon
                        const badgeValue =
                          item.badgeKey && summary ? summary[item.badgeKey] : null

                        return (
                          <NavLink
                            key={item.href}
                            className={cn(
                              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                              active
                                ? 'bg-white/10 text-[#ffb13d]'
                                : 'text-[#d4deea] hover:bg-white/6 hover:text-white'
                            )}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
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

            <div className="border-t border-white/7 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-[#8c7340] bg-[#243245] font-semibold text-[#ffb13d]">
                  {auth.authMe?.app_user?.email?.slice(0, 2).toUpperCase() ?? 'TW'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {auth.authMe?.app_user?.email ?? 'TWA Staff'}
                  </p>
                  <p className="text-xs text-[#90a8cb]">Staff workspace</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <StatusBadge tone="info">staff</StatusBadge>
                <AdminButton
                  className="flex-1"
                  variant="secondary"
                  onClick={() => void auth.logout()}
                >
                  Sign out
                </AdminButton>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-h-screen lg:min-w-0">{shellContent}</div>
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
