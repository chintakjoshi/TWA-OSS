import { Link } from 'react-router-dom'

import { publicAppUrl } from '../app/authClient'
import { AdminButton, StatusBadge } from '../components/ui/AdminUi'

const adminFocus = [
  'Review pending employers and listings without leaving the staff workspace.',
  'Edit jobseeker records, run both matching directions, and manage application outcomes.',
  'Control notification behavior and inspect the audit log from the same portal.',
]

export function AdminLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f1e5] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-[#d9ccb8] bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] bg-[#132130] p-8 text-white sm:p-10">
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

            <StatusBadge className="mt-10" tone="warning">
              Staff Admin Panel
            </StatusBadge>
            <h1 className="admin-display mt-8 max-w-[10ch] text-[clamp(3.2rem,5vw,5rem)] leading-[0.95] font-semibold">
              Operate the full TWA workflow from one staff console.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#aebfd6]">
              The staff portal is the operational surface for approvals,
              matching, hiring, notifications, and audit history.
            </p>

            <ul className="mt-10 space-y-5">
              {adminFocus.map((item) => (
                <li key={item} className="flex gap-4">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#d99a2b]" />
                  <span className="text-lg leading-8 text-[#dce6f2]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-auth-pattern rounded-[32px] border border-[#e4d8c6] p-8 sm:p-10">
            <StatusBadge tone="warning">Staff Access</StatusBadge>
            <h2 className="admin-display mt-8 text-[3rem] leading-[0.98] font-semibold text-slate-950">
              Welcome back
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-500">
              Use the redesigned staff workspace to move from queue triage to
              placements without losing operational context.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth">
                <AdminButton>Open staff sign in</AdminButton>
              </Link>
              <a href={publicAppUrl}>
                <AdminButton variant="secondary">Open welcome page</AdminButton>
              </a>
            </div>

            <div className="mt-12 rounded-[28px] border border-[#eadfce] bg-white/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]">
                What the staff portal covers
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-5">
                  <p className="admin-display text-2xl font-semibold text-slate-950">
                    Queue management
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Employer and listing approvals with clear status controls.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-5">
                  <p className="admin-display text-2xl font-semibold text-slate-950">
                    Matching + placements
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Two-way match views, application updates, and hire tracking.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
