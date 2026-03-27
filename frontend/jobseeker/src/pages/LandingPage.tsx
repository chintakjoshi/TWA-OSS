import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  MapPinned,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { employerAppUrl } from '../app/authClient'

const jobseekerHighlights = [
  {
    icon: BriefcaseBusiness,
    title: 'Browse jobs',
    copy: 'Search active listings and see fit at a glance.',
  },
  {
    icon: MapPinned,
    title: 'Match by transit',
    copy: 'Surface jobs you can realistically reach.',
  },
  {
    icon: ShieldCheck,
    title: 'Track applications',
    copy: 'Follow submitted, reviewed, and hired statuses.',
  },
]

const employerHighlights = [
  {
    icon: ClipboardList,
    title: 'Manage listings',
    copy: 'Open and review approved roles from a separate employer workspace.',
  },
  {
    icon: Users,
    title: 'Review applicants',
    copy: 'Follow submitted, reviewed, and hired applicants in one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Separate access',
    copy: 'Employer actions stay separate from jobseeker browsing.',
  },
]

export function JobseekerLandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <header className="border-b border-[#ddcfba] bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#132130] text-lg font-semibold text-white">
              T
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-slate-950">
                Transformative Workforce Academy
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8da2c5]">
                Jobseeker entry
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="jobseeker-grid-surface flex h-full flex-col overflow-hidden rounded-[32px] border border-[#1f3145] bg-[#132130] px-7 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] sm:px-8">
            <div className="max-w-[500px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1b552]">
                TWA Jobseeker Portal
              </p>
              <h1 className="jobseeker-display mt-4 text-[clamp(2rem,3.1vw,2.85rem)] leading-[1] font-semibold">
                Find your next chapter with a clearer path forward.
              </h1>
              <p className="mt-4 max-w-[470px] text-[14px] leading-6 text-[#c8d6e7]">
                Build your profile, browse fair-chance listings, and keep track
                of each application in one place.
              </p>
            </div>

            <div className="mt-6">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold text-white transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                to="/auth"
              >
                <ArrowRight className="h-4 w-4" />
                Start as a jobseeker
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {jobseekerHighlights.map(({ copy, icon: Icon, title }) => (
                <div
                  key={title}
                  className="rounded-[20px] border border-white/10 bg-white/5 p-3.5"
                >
                  <div className="grid h-8.5 w-8.5 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#f1b552]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#91a8ca]">
                    {title}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-6 text-[#dbe5f1]">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="jobseeker-grid-surface flex h-full flex-col overflow-hidden rounded-[32px] border border-[#1f3145] bg-[#132130] px-7 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] sm:px-8">
            <div className="max-w-[500px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1b552]">
                Employer workspace
              </p>
              <h2 className="jobseeker-display mt-4 text-[clamp(2rem,3.1vw,2.85rem)] leading-[1] font-semibold">
                Hire through a dedicated employer portal.
              </h2>
              <p className="mt-4 max-w-[470px] text-[14px] leading-6 text-[#c8d6e7]">
                Employers use a separate workspace to manage listings, review
                applicants, and keep hiring activity outside the jobseeker entry
                flow.
              </p>
            </div>

            <div className="mt-6">
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                href={employerAppUrl}
                style={{ color: '#ffffff' }}
              >
                <ArrowRight className="h-4 w-4" />
                Open Employer Portal
              </a>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {employerHighlights.map(({ copy, icon: Icon, title }) => (
                <div
                  key={title}
                  className="rounded-[20px] border border-white/10 bg-white/5 p-3.5"
                >
                  <div className="grid h-8.5 w-8.5 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#f1b552]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#91a8ca]">
                    {title}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-6 text-[#dbe5f1]">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
