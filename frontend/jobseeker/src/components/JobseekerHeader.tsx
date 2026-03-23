import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { cn } from '../lib/cn'
import { getInitials } from '../lib/formatting'
import { PortalBadge, PortalButton } from './ui/JobseekerUi'

function linkClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-14 items-center border-b-2 px-2 text-sm font-semibold transition',
    isActive
      ? 'border-[#d0922c] text-slate-950'
      : 'border-transparent text-slate-500 hover:text-slate-900'
  )
}

export function JobseekerHeader() {
  const auth = useAuth()
  const identity =
    auth.authMe?.app_user?.email ??
    auth.authMe?.app_user?.id ??
    'Jobseeker account'

  return (
    <header className="sticky top-0 z-30 border-b border-[#ddcfba] bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1260px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <NavLink className="mr-2 flex items-center gap-3" to="/jobs">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#132130] text-base font-semibold text-white">
            T
          </div>
          <div>
            <p className="text-lg font-semibold leading-none text-slate-950">
              TWA Jobs
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8da2c5]">
              Jobseeker Portal
            </p>
          </div>
        </NavLink>

        <nav
          aria-label="Jobseeker workspace"
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <NavLink className={({ isActive }) => linkClassName(isActive)} to="/jobs">
            Browse Jobs
          </NavLink>
          <NavLink
            className={({ isActive }) => linkClassName(isActive)}
            to="/applications"
          >
            My Applications
          </NavLink>
          <NavLink
            className={({ isActive }) => linkClassName(isActive)}
            to="/profile"
          >
            My Profile
          </NavLink>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <PortalBadge
            tone={auth.authMe?.profile_complete ? 'success' : 'warning'}
          >
            {auth.authMe?.profile_complete ? 'Profile complete' : 'Profile setup'}
          </PortalBadge>
          <div className="flex items-center gap-3 rounded-full border border-[#ddcfba] bg-[#fcfaf6] px-3 py-2">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#bfd5e7] bg-[#eef6ff] text-sm font-semibold text-[#2458b8]">
              {getInitials(identity)}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                {identity}
              </p>
              <p className="text-xs text-slate-500">Jobseeker workspace</p>
            </div>
          </div>
          <PortalButton variant="secondary" onClick={() => void auth.logout()}>
            Sign Out
          </PortalButton>
        </div>
      </div>
    </header>
  )
}
