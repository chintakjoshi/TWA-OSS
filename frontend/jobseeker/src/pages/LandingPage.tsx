import {
  ArrowRight,
  BriefcaseBusiness,
  MapPinned,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { adminAppUrl, employerAppUrl } from '../app/authClient'
import { PortalPanel } from '../components/ui/JobseekerUi'

const highlights = [
  'Complete a guided profile before browsing and applying.',
  'See which jobs line up with your transit and background fit.',
  'Track every application in one place once your profile is ready.',
]

export function JobseekerLandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <header className="border-b border-[#ddcfba] bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1260px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#132130] text-lg font-semibold text-white">
              T
            </div>
            <div>
              <p className="text-xl font-semibold leading-none text-slate-950">
                Transformative Workforce Academy
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8da2c5]">
                Jobseeker entry
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
            <Link className="hover:text-slate-950" to="/auth">
              Jobseeker sign in
            </Link>
            <a className="hover:text-slate-950" href={employerAppUrl}>
              Employer portal
            </a>
            <a className="hover:text-slate-950" href={adminAppUrl}>
              Staff portal
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-[1260px] gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-center sm:px-6">
        <section className="jobseeker-grid-surface overflow-hidden rounded-[36px] border border-[#1f3145] bg-[#132130] px-8 py-10 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] sm:px-10 sm:py-12">
          <div className="max-w-[620px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1b552]">
              TWA Jobseeker Portal
            </p>
            <h1 className="jobseeker-display mt-6 text-[clamp(3.2rem,7vw,5.4rem)] leading-[0.95] font-semibold">
              Find your next chapter with a clearer path forward.
            </h1>
            <p className="mt-6 max-w-[540px] text-lg leading-8 text-[#c8d6e7]">
              Build your TWA profile, browse open fair-chance listings, and
              track the applications you submit through your case
              manager-supported workflow.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold text-white transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                to="/auth"
              >
                <ArrowRight className="h-4 w-4" />
                Start as a Jobseeker
              </Link>
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#ddd1be] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#cfbeaa] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                href={employerAppUrl}
              >
                Employer Portal
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <BriefcaseBusiness className="h-6 w-6 text-[#f1b552]" />
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#91a8ca]">
                  Browse jobs
                </p>
                <p className="mt-2 text-sm leading-6 text-[#dbe5f1]">
                  Search active listings and see profile-based fit at a glance.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <MapPinned className="h-6 w-6 text-[#f1b552]" />
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#91a8ca]">
                  Match by transit
                </p>
                <p className="mt-2 text-sm leading-6 text-[#dbe5f1]">
                  Surface listings that respect how you can realistically
                  travel.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="h-6 w-6 text-[#f1b552]" />
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#91a8ca]">
                  Track applications
                </p>
                <p className="mt-2 text-sm leading-6 text-[#dbe5f1]">
                  Follow submitted, reviewed, and hired statuses in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        <PortalPanel className="bg-white/90">
          <div className="space-y-8 px-8 py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]">
                What this portal covers
              </p>
              <h2 className="jobseeker-display mt-3 text-[2.3rem] leading-[1.02] font-semibold text-slate-950">
                A guided path from sign-in to application tracking.
              </h2>
            </div>

            <div className="space-y-4">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-4"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#d0922c]" />
                  <p className="text-sm leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>

            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold text-white transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
              to="/auth"
            >
              <ArrowRight className="h-4 w-4" />
              Continue to sign in
            </Link>
          </div>
        </PortalPanel>
      </main>
    </div>
  )
}
