import { Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { cn } from '../lib/cn'
import { PortalBadge } from './ui/JobseekerUi'

function linkClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-14 items-center border-b-2 px-2 text-sm font-semibold transition',
    isActive
      ? 'border-[#d0922c] text-slate-950'
      : 'border-transparent text-slate-500 hover:text-slate-900'
  )
}

function profileLinkClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold transition',
    isActive
      ? 'border-[#d0922c] bg-[#fff8ea] text-slate-950'
      : 'border-[#ddcfba] bg-[#fcfaf6] text-slate-600 hover:border-[#cfbeaa] hover:text-slate-900'
  )
}

interface JobseekerHeaderProps {
  jobsSearch?: {
    busy?: boolean
    onChange: (value: string) => void
    onSubmit: () => void
    value: string
  }
}

export function JobseekerHeader({ jobsSearch }: JobseekerHeaderProps = {}) {
  const auth = useAuth()

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
          className={cn(
            'flex flex-wrap items-center gap-2',
            jobsSearch ? '' : 'flex-1'
          )}
        >
          <NavLink
            className={({ isActive }) => linkClassName(isActive)}
            to="/jobs"
          >
            Browse Jobs
          </NavLink>
          <NavLink
            className={({ isActive }) => linkClassName(isActive)}
            to="/applications"
          >
            My Applications
          </NavLink>
        </nav>

        {jobsSearch ? (
          <form
            className="flex h-11 w-full items-center gap-2 rounded-2xl border border-[#ddcfba] bg-[#fcfaf6] px-3 lg:w-[520px]"
            onSubmit={(event) => {
              event.preventDefault()
              jobsSearch.onSubmit()
            }}
          >
            <Search className="h-4 w-4 text-[#8da2c5]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Search by role, city, or keyword..."
              value={jobsSearch.value}
              onChange={(event) => jobsSearch.onChange(event.target.value)}
            />
            <button
              aria-label="Search jobs"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-slate-600 transition hover:bg-[#f2ebdf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
              disabled={jobsSearch.busy}
              type="submit"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {auth.authMe?.profile_complete === false ? (
            <NavLink to="/profile">
              <PortalBadge tone="warning">Complete profile</PortalBadge>
            </NavLink>
          ) : null}
          <NavLink
            className={({ isActive }) => profileLinkClassName(isActive)}
            to="/profile"
          >
            My Profile
          </NavLink>
        </div>
      </div>
    </header>
  )
}
