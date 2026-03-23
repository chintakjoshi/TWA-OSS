import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { HttpError } from '@shared/lib/http'

import { announceComingSoon } from '../lib/comingSoon'
import {
  AdminButton,
  InlineNotice,
  StatusBadge,
  inputClassName,
} from '../components/ui/AdminUi'

type AuthMode = 'login' | 'forgot' | 'reset' | 'otp'

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

const supportPoints = [
  'Employer and listing review queues for approvals and change requests',
  'Two-way matching between jobseekers and listings',
  'Application tracker with hired status and placement follow-through',
  'Full audit visibility across sensitive staff actions',
]

export function AdminAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)
  const [mode, setMode] = useState<AuthMode>(
    auth.state === 'otp_required' ? 'otp' : 'login'
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  )
  const [staySignedIn, setStaySignedIn] = useState(true)

  const authenticatedStaff = auth.authMe?.app_user?.app_role === 'staff'
  const title = useMemo(() => {
    if (mode === 'forgot') return 'Reset your password'
    if (mode === 'reset') return 'Complete password reset'
    if (mode === 'otp') return 'Verify sign-in'
    return 'Welcome back'
  }, [mode])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await task()
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5] lg:grid lg:grid-cols-[520px_minmax(0,1fr)]">
      <aside className="admin-grid-surface bg-[#132130] px-10 py-12 text-white">
        <div className="flex h-full flex-col">
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

          <div className="mt-20 max-w-[360px]">
            <h1 className="admin-display text-[clamp(3rem,5vw,4.5rem)] leading-[0.96] font-semibold">
              Staff <span className="text-[#f3ac34] italic">Admin</span> Portal
            </h1>
            <p className="mt-8 text-xl leading-9 text-[#aebfd6]">
              Secure access for TWA case managers and administrators. Manage
              employer approvals, jobseeker profiles, listing reviews, and
              placement tracking from one place.
            </p>

            <ul className="mt-12 space-y-6">
              {supportPoints.map((point) => (
                <li key={point} className="flex gap-4">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#d99a2b]" />
                  <span className="text-lg leading-8 text-[#dce6f2]">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-[#8ea3c4]">
            Internal use only. Unauthorized access to this system is prohibited
            and subject to applicable law.
          </div>
        </div>
      </aside>

      <main className="admin-auth-pattern flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[560px] rounded-[32px] border border-[#e4d8c6] bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <StatusBadge tone="warning" className="mb-8">
            Staff Access
          </StatusBadge>

          <h2 className="admin-display text-[3rem] leading-[0.98] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Sign in with your TWA staff credentials.
          </p>

          <div className="mt-8 space-y-4">
            {notice ? (
              <InlineNotice tone="success">{notice}</InlineNotice>
            ) : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            {!authenticatedStaff &&
            auth.authMe?.app_user &&
            auth.authMe.app_user.app_role !== 'staff' ? (
              <InlineNotice tone="danger">
                This account is linked to the{' '}
                <strong>{auth.authMe.app_user.app_role}</strong> portal, so
                staff routes stay locked.
              </InlineNotice>
            ) : null}

            {!authenticatedStaff &&
            auth.state === 'authenticated' &&
            !auth.authMe?.app_user ? (
              <InlineNotice tone="info">
                You authenticated successfully, but this identity is not yet
                provisioned as a local TWA staff account.
              </InlineNotice>
            ) : null}
          </div>

          {authenticatedStaff ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-[24px] border border-[#d8ccb9] bg-[#fcfaf6] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Staff Session
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {auth.authMe?.app_user?.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Auth state: {authStateLabel.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <StatusBadge tone="success">staff ready</StatusBadge>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex" to="/dashboard">
                  <AdminButton>Open dashboard</AdminButton>
                </Link>
                <AdminButton
                  variant="secondary"
                  onClick={() => void auth.logout()}
                >
                  Sign out
                </AdminButton>
              </div>
            </div>
          ) : null}

          {!authenticatedStaff &&
          (mode === 'login' || auth.state !== 'otp_required') ? (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  const email = String(form.get('email') ?? '').trim()
                  try {
                    await auth.login({
                      email,
                      password: String(form.get('password') ?? ''),
                    })
                  } catch (nextError) {
                    if (
                      nextError instanceof HttpError &&
                      nextError.code === 'email_not_verified'
                    ) {
                      setVerificationEmail(email)
                      setNotice(
                        'Verify your email before signing in. You can resend the verification email below.'
                      )
                      return
                    }
                    throw nextError
                  }
                  if (staySignedIn) {
                    setNotice('Signed in through the shared auth service.')
                  }
                })
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Staff Email
                </label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ea3c4]" />
                  <input
                    className={`${inputClassName} pl-12`}
                    defaultValue=""
                    name="email"
                    placeholder="you@twa.slu.edu"
                    required
                    type="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Password
                </label>
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ea3c4]" />
                  <input
                    className={`${inputClassName} pl-12`}
                    name="password"
                    placeholder="Your password"
                    required
                    type="password"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    checked={staySignedIn}
                    className="h-4 w-4 rounded border-[#d8ccb9]"
                    type="checkbox"
                    onChange={(event) => setStaySignedIn(event.target.checked)}
                  />
                  Keep me signed in
                </label>
                <button
                  className="font-semibold text-[#d0922c]"
                  type="button"
                  onClick={() => setMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>

              <AdminButton className="w-full" disabled={busy} type="submit">
                {busy ? 'Signing in...' : 'Sign in'}
              </AdminButton>
            </form>
          ) : null}

          {auth.state === 'otp_required' || mode === 'otp' ? (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.verifyLoginOtp({
                    challenge_token: auth.otpChallenge!.challenge_token,
                    code: String(form.get('code') ?? ''),
                  })
                  setNotice(
                    'OTP verified. You can continue into the staff portal.'
                  )
                })
              }}
            >
              <InlineNotice tone="info">
                Enter the code sent to {auth.otpChallenge?.masked_email}.
              </InlineNotice>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  OTP Code
                </label>
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  maxLength={12}
                  minLength={4}
                  name="code"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <AdminButton disabled={busy} type="submit">
                  {busy ? 'Verifying...' : 'Verify OTP'}
                </AdminButton>
                <AdminButton
                  disabled={busy}
                  variant="secondary"
                  onClick={() => {
                    void run(async () => {
                      await auth.resendLoginOtp()
                      setNotice('A fresh OTP has been sent.')
                    })
                  }}
                >
                  Resend OTP
                </AdminButton>
              </div>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.requestPasswordReset({
                    email: String(form.get('email') ?? ''),
                  })
                  setNotice(
                    'If that account exists, the auth service has sent a reset link.'
                  )
                })
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Staff Email
                </label>
                <input
                  className={inputClassName}
                  name="email"
                  required
                  type="email"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <AdminButton disabled={busy} type="submit">
                  {busy ? 'Sending...' : 'Send reset email'}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => setMode('login')}
                >
                  Back to sign in
                </AdminButton>
              </div>
            </form>
          ) : null}

          {mode === 'reset' ? (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.resetPassword({
                    token: String(form.get('token') ?? ''),
                    new_password: String(form.get('new_password') ?? ''),
                  })
                  setMode('login')
                  setNotice('Password updated. Sign in with the new password.')
                })
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Reset Token
                </label>
                <input
                  className={inputClassName}
                  minLength={16}
                  name="token"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  New Password
                </label>
                <input
                  className={inputClassName}
                  minLength={8}
                  name="new_password"
                  required
                  type="password"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <AdminButton disabled={busy} type="submit">
                  {busy ? 'Resetting...' : 'Reset password'}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => setMode('login')}
                >
                  Back to sign in
                </AdminButton>
              </div>
            </form>
          ) : null}

          {verificationEmail ? (
            <div className="mt-8">
              <InlineNotice tone="info">
                Verification is still pending for{' '}
                <strong>{verificationEmail}</strong>.
              </InlineNotice>
              <div className="mt-3">
                <AdminButton
                  disabled={busy}
                  variant="secondary"
                  onClick={() => {
                    void run(async () => {
                      await auth.requestVerificationEmailResend({
                        email: verificationEmail,
                      })
                      setNotice(
                        'If that account still needs verification, a fresh email has been sent.'
                      )
                    })
                  }}
                >
                  Resend verification email
                </AdminButton>
              </div>
            </div>
          ) : null}

          {!authenticatedStaff ? (
            <>
              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#eadfce]" />
                <span className="text-sm text-slate-400">or</span>
                <div className="h-px flex-1 bg-[#eadfce]" />
              </div>

              <AdminButton
                className="w-full"
                icon={Home}
                variant="secondary"
                onClick={() => announceComingSoon('SLU Single Sign-On')}
              >
                Sign in with SLU Single Sign-On
              </AdminButton>

              <p className="mt-8 text-center text-sm text-slate-400">
                Not a staff member? Visit the{' '}
                <a
                  className="font-semibold text-[#d0922c]"
                  href="http://localhost:5173"
                >
                  Jobseeker Portal
                </a>{' '}
                or{' '}
                <a
                  className="font-semibold text-[#d0922c]"
                  href="http://localhost:5174"
                >
                  Employer Portal
                </a>
                .
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <AdminButton variant="ghost" onClick={() => setMode('login')}>
                  Sign in
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setMode('forgot')}>
                  Forgot password
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setMode('reset')}>
                  Manual reset
                </AdminButton>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-[#8ea3c4]">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Shared auth foundation with TWA role-based access checks.
                </span>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
