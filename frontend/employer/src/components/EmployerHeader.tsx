import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { PortalBadge } from './ui/EmployerUi'

function EmployerNavLink({
  to,
  label,
  badge,
}: {
  to: string
  label: string
  badge?: number | null
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          'inline-flex min-h-12 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition',
          isActive
            ? 'border-[#d0922c] text-slate-950'
            : 'border-transparent text-slate-400 hover:text-slate-700',
        ].join(' ')
      }
      to={to}
    >
      <span>{label}</span>
      {badge ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#e7f0ff] px-1.5 text-[11px] text-[#2458b8]">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export function EmployerHeader({
  listingCount,
}: {
  listingCount?: number | null
}) {
  const auth = useAuth()
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'

  return (
    <header className="sticky top-0 z-30 border-b border-[#e6dbc8] bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
        <NavLink className="mr-2 flex items-center gap-3" to="/dashboard">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#132130] text-sm font-semibold text-white">
            T
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">
              TWA Employers
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8ea3c4]">
              Transformative Workforce Academy
            </p>
          </div>
        </NavLink>

        <nav
          className="flex flex-wrap items-center gap-5"
          aria-label="Employer workspace"
        >
          <EmployerNavLink label="Dashboard" to="/dashboard" />
          <EmployerNavLink label="Submit Listing" to="/submit-listing" />
          <EmployerNavLink
            badge={listingCount ?? undefined}
            label="My Listings"
            to="/my-listings"
          />
          <EmployerNavLink label="Applicants" to="/applicants" />
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {reviewStatus === 'pending' ? (
            <PortalBadge tone="info">Pending Review</PortalBadge>
          ) : null}
          <NavLink
            className={({ isActive }) =>
              [
                'inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold transition',
                isActive
                  ? 'border-[#d0922c] bg-[#fff8ea] text-slate-950'
                  : 'border-[#ddcfba] bg-[#fcfaf6] text-slate-600 hover:border-[#cfbeaa] hover:text-slate-900',
              ].join(' ')
            }
            to="/profile"
          >
            My Profile
          </NavLink>
        </div>
      </div>
    </header>
  )
}
