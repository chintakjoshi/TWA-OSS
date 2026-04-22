import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Home, LockKeyhole, Mail } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthErrorMessage } from '@shared/auth/errorMessage'
import { OtpCodeInput } from '@shared/auth/OtpCodeInput'
import { isCompleteOtpCode } from '@shared/auth/otp'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { HttpError } from '@shared/lib/http'

import { announceComingSoon } from '../lib/comingSoon'
import {
  AdminButton,
  InlineNotice,
  StatusBadge,
  inputClassName,
} from '../components/ui/AdminUi'

type AuthMode = 'login' | 'forgot' | 'otp'

const authIconFieldClassName =
  'h-full w-full rounded-xl border border-[#ddcfba] bg-white px-4 py-0 text-[0.95rem] leading-[46px] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition placeholder:text-slate-400 focus:border-[#d0922c] focus:ring-4 focus:ring-[#d0922c]/10'

function getErrorMessage(error: unknown) {
  return getAuthErrorMessage(error)
}

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
  const [otpCode, setOtpCode] = useState('')
  const [staySignedIn, setStaySignedIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const authenticatedStaff = auth.authMe?.app_user?.app_role === 'staff'
  const title = useMemo(() => {
    if (mode === 'forgot') return 'Reset your password'
    if (mode === 'otp') return 'Verify sign-in'
    return 'Welcome back'
  }, [mode])

  const subtitle = useMemo(() => {
    if (mode === 'forgot') {
      return "Enter your staff email and we'll send reset instructions if the account exists."
    }
    if (mode === 'otp') {
      return 'Enter the verification code to continue into the staff portal.'
    }
    return 'Sign in with your TWA staff credentials.'
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
    <div className="min-h-screen bg-[#f7f1e5] lg:grid lg:h-screen lg:grid-cols-[520px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="admin-grid-surface bg-[#132130] px-8 py-8 text-white lg:h-screen lg:overflow-hidden xl:px-10 xl:py-10">
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

          <div className="mt-12 max-w-[330px] xl:mt-16">
            <h1 className="admin-display text-[clamp(2.8rem,4vw,4rem)] leading-[0.96] font-semibold">
              Staff <span className="text-[#f3ac34] italic">Admin</span> Portal
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#aebfd6]">
              Secure access for TWA case managers and administrators. Manage
              employer approvals, jobseeker profiles, listing reviews, and
              placement tracking from one place.
            </p>
          </div>
        </div>
      </aside>

      <main className="admin-auth-pattern flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-[560px] rounded-[32px] border border-[#e4d8c6] bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <StatusBadge tone="warning" className="mb-8">
            Staff Access
          </StatusBadge>

          <h2 className="admin-display text-[3rem] leading-[0.98] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-4 text-lg text-slate-500">{subtitle}</p>

          <div className="mt-8 space-y-4">
            {notice ? (
              <InlineNotice tone="success">{notice}</InlineNotice>
            ) : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
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
                  onClick={() => {
                    void run(() => auth.logout())
                  }}
                >
                  Sign out
                </AdminButton>
              </div>
            </div>
          ) : null}

          {!authenticatedStaff &&
          mode === 'login' &&
          auth.state !== 'otp_required' ? (
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
                })
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  Staff Email
                </label>
                <div className="relative mt-2 h-12">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center">
                    <Mail className="h-5 w-5 text-[#8ea3c4]" />
                  </div>
                  <input
                    className={`${authIconFieldClassName} pl-12`}
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
                <div className="relative mt-2 h-12">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center">
                    <LockKeyhole className="h-5 w-5 text-[#8ea3c4]" />
                  </div>
                  <button
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-[#8ea3c4] transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                    )}
                  </button>
                  <input
                    className={`${authIconFieldClassName} pr-12 pl-12`}
                    name="password"
                    placeholder="Your password"
                    required
                    type={showPassword ? 'text' : 'password'}
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
                void run(async () => {
                  if (!isCompleteOtpCode(otpCode)) {
                    throw new Error('Enter the 6-digit OTP code.')
                  }
                  await auth.verifyLoginOtp({
                    challenge_token: auth.otpChallenge!.challenge_token,
                    code: otpCode,
                  })
                  setOtpCode('')
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
                <div className="mt-2">
                  <OtpCodeInput
                    ariaLabel="OTP code"
                    name="code"
                    value={otpCode}
                    onChange={setOtpCode}
                  />
                </div>
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
                    'If that account exists, a reset link has been sent.'
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
              {mode === 'login' ? (
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
                </>
              ) : null}

              <p className="mt-8 text-center text-sm text-slate-500">
                Not a staff member? Visit the{' '}
                <a
                  className="font-semibold text-[#b77712] underline decoration-2 underline-offset-4 transition hover:text-[#8f5b08]"
                  href="http://localhost:5173"
                >
                  Jobseeker Portal
                </a>{' '}
                or{' '}
                <a
                  className="font-semibold text-[#b77712] underline decoration-2 underline-offset-4 transition hover:text-[#8f5b08]"
                  href="http://localhost:5174"
                >
                  Employer Portal
                </a>
                .
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
