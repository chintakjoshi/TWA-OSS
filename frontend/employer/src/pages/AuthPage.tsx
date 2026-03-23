import { useEffect, useMemo, useState } from 'react'
import { Building2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { HttpError } from '@shared/lib/http'

import { adminAppUrl, jobseekerAppUrl } from '../app/authClient'
import {
  InlineNotice,
  PortalBadge,
  PortalButton,
  inputClassName,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'otp' | 'verify'

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

const supportPoints = [
  'Create your employer account with work email credentials.',
  'Complete your TWA organization profile after sign-up so staff can review it.',
  'Submit listings for staff review once the employer account is approved.',
  'Review applicants only when TWA has enabled applicant sharing.',
]

export function EmployerAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)
  const [mode, setMode] = useState<AuthMode>(
    auth.state === 'otp_required' ? 'otp' : 'login'
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  useEffect(() => {
    if (auth.state === 'otp_required') setMode('otp')
  }, [auth.state])

  const wrongPortal =
    auth.authMe?.app_user && auth.authMe.app_user.app_role !== 'employer'
  const title = useMemo(() => {
    if (mode === 'signup') return 'Create your employer account'
    if (mode === 'forgot') return 'Reset your password'
    if (mode === 'reset') return 'Complete password reset'
    if (mode === 'otp') return 'Verify sign-in'
    if (mode === 'verify') return 'Verify your email'
    return 'Employer portal access'
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
      <aside className="employer-grid-surface bg-[#132130] px-10 py-12 text-white">
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

          <div className="mt-20 max-w-[390px]">
            <h1 className="employer-display text-[clamp(3rem,5vw,4.5rem)] leading-[0.96] font-semibold">
              Build a stronger workforce with{' '}
              <span className="text-[#f3ac34] italic">fair-chance</span>{' '}
              talent.
            </h1>
            <p className="mt-8 text-xl leading-9 text-[#aebfd6]">
              Join Missouri employers using TWA to open vetted opportunities,
              review listing approvals, and connect with motivated candidates.
            </p>

            <ul className="mt-12 space-y-6">
              {supportPoints.map((point) => (
                <li key={point} className="flex gap-4">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#d99a2b]" />
                  <span className="text-lg leading-8 text-[#dce6f2]">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-[#8ea3c4]">
            Employer credentials are separate from jobseeker and staff accounts.
            TWA role checks keep each portal isolated.
          </div>
        </div>
      </aside>

      <main className="employer-auth-pattern flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[620px] rounded-[32px] border border-[#e4d8c6] bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <PortalBadge tone="warning" className="mb-8">
            Employer Access
          </PortalBadge>

          <h2 className="employer-display text-[2.9rem] leading-[0.98] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Sign in with your employer credentials, then complete the TWA
            organization setup.
          </p>

          <div className="mt-8 space-y-4">
            {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
            {wrongPortal ? (
              <InlineNotice tone="danger">
                This account is linked to the{' '}
                <strong>{auth.authMe?.app_user?.app_role}</strong> portal, so the
                employer workspace stays locked here.
              </InlineNotice>
            ) : null}
          </div>

          {!wrongPortal ? (
            <div className="mt-8 space-y-6">
              <div className="flex gap-4 border-b border-[#eadfce] text-sm font-semibold">
                <button
                  className={`border-b-2 pb-3 transition ${
                    mode === 'login'
                      ? 'border-[#d0922c] text-slate-950'
                      : 'border-transparent text-slate-400'
                  }`}
                  type="button"
                  onClick={() => setMode('login')}
                >
                  Sign In
                </button>
                <button
                  className={`border-b-2 pb-3 transition ${
                    mode === 'signup'
                      ? 'border-[#d0922c] text-slate-950'
                      : 'border-transparent text-slate-400'
                  }`}
                  type="button"
                  onClick={() => setMode('signup')}
                >
                  Register
                </button>
              </div>

              {mode === 'login' ? (
                <form
                  className="space-y-5"
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
                          setMode('verify')
                          setNotice(
                            'Verify your work email before signing in. You can resend the confirmation below.'
                          )
                          return
                        }
                        throw nextError
                      }
                      setNotice('Signed in through the shared auth service.')
                    })
                  }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Work email
                    </label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ea3c4]" />
                      <input
                        className={`${inputClassName} pl-12`}
                        name="email"
                        placeholder="you@yourcompany.com"
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
                        minLength={8}
                        name="password"
                        placeholder="Your password"
                        required
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <button
                      className="font-semibold text-[#d0922c]"
                      type="button"
                      onClick={() => setMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <PortalButton className="w-full" disabled={busy} type="submit">
                    {busy ? 'Signing in...' : 'Sign In'}
                  </PortalButton>
                </form>
              ) : null}

              {mode === 'signup' ? (
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = new FormData(event.currentTarget)
                    void run(async () => {
                      const email = String(form.get('email') ?? '').trim()
                      await auth.signup({
                        email,
                        password: String(form.get('password') ?? ''),
                      })
                      setVerificationEmail(email)
                      setMode('verify')
                      setNotice(
                        'Account created in the shared auth service. Verify your email, then sign in to continue into employer setup.'
                      )
                    })
                  }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Work email
                    </label>
                    <input
                      className={inputClassName}
                      name="email"
                      placeholder="you@yourcompany.com"
                      required
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Password
                    </label>
                    <input
                      className={inputClassName}
                      minLength={8}
                      name="password"
                      placeholder="Create a secure password"
                      required
                      type="password"
                    />
                  </div>
                  <PortalButton className="w-full" disabled={busy} type="submit">
                    {busy ? 'Creating account...' : 'Create Employer Account'}
                  </PortalButton>
                </form>
              ) : null}

              {mode === 'forgot' ? (
                <form
                  className="space-y-5"
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
                      Work email
                    </label>
                    <input
                      className={inputClassName}
                      name="email"
                      required
                      type="email"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PortalButton disabled={busy} type="submit">
                      {busy ? 'Sending...' : 'Send reset email'}
                    </PortalButton>
                    <PortalButton variant="secondary" onClick={() => setMode('login')}>
                      Back to sign in
                    </PortalButton>
                  </div>
                </form>
              ) : null}

              {mode === 'reset' ? (
                <form
                  className="space-y-5"
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
                      Reset token
                    </label>
                    <input className={inputClassName} name="token" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      New password
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
                    <PortalButton disabled={busy} type="submit">
                      {busy ? 'Resetting...' : 'Reset password'}
                    </PortalButton>
                    <PortalButton variant="secondary" onClick={() => setMode('login')}>
                      Back to sign in
                    </PortalButton>
                  </div>
                </form>
              ) : null}

              {mode === 'otp' && auth.otpChallenge ? (
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = new FormData(event.currentTarget)
                    void run(async () => {
                      await auth.verifyLoginOtp({
                        challenge_token: auth.otpChallenge!.challenge_token,
                        code: String(form.get('code') ?? ''),
                      })
                      setNotice('OTP verified. Continue into employer setup.')
                    })
                  }}
                >
                  <InlineNotice tone="info">
                    Enter the code sent to {auth.otpChallenge.masked_email}.
                  </InlineNotice>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      OTP code
                    </label>
                    <input
                      className={inputClassName}
                      inputMode="numeric"
                      name="code"
                      required
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PortalButton disabled={busy} type="submit">
                      {busy ? 'Verifying...' : 'Verify OTP'}
                    </PortalButton>
                    <PortalButton
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
                    </PortalButton>
                  </div>
                </form>
              ) : null}

              {mode === 'verify' ? (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-[#d8ccb9] bg-[#fcfaf6] px-6 py-8 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eef6ff] text-[#2458b8]">
                      <Mail className="h-7 w-7" />
                    </div>
                    <h3 className="employer-display mt-6 text-[2rem] font-semibold text-slate-950">
                      Verify your email
                    </h3>
                    <p className="mx-auto mt-4 max-w-[380px] text-sm leading-7 text-slate-500">
                      We sent a confirmation link to your work email. Activate the
                      account, then return here to continue employer setup.
                    </p>
                    <div className="mt-6 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 font-medium text-slate-700">
                      {verificationEmail ?? 'you@yourcompany.com'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PortalButton
                      className="flex-1"
                      onClick={() => {
                        setMode('login')
                        setNotice('Once your email is verified, sign in to continue.')
                      }}
                    >
                      I&apos;ve verified my email
                    </PortalButton>
                    <PortalButton
                      className="flex-1"
                      disabled={busy || !verificationEmail}
                      variant="secondary"
                      onClick={() => {
                        if (!verificationEmail) return
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
                      Resend email
                    </PortalButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#eadfce]" />
            <span className="text-sm text-slate-400">or</span>
            <div className="h-px flex-1 bg-[#eadfce]" />
          </div>

          <PortalButton
            className="w-full"
            icon={Building2}
            variant="secondary"
            onClick={() => announceComingSoon('Employer SSO')}
          >
            Sign in with company SSO
          </PortalButton>

          <p className="mt-8 text-center text-sm text-slate-400">
            Looking for another experience? Visit the{' '}
            <a className="font-semibold text-[#d0922c]" href={jobseekerAppUrl}>
              Jobseeker Portal
            </a>{' '}
            or{' '}
            <a className="font-semibold text-[#d0922c]" href={adminAppUrl}>
              Staff Portal
            </a>
            .
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <PortalButton variant="ghost" onClick={() => setMode('login')}>
              Sign in
            </PortalButton>
            <PortalButton variant="ghost" onClick={() => setMode('signup')}>
              Register
            </PortalButton>
            <PortalButton variant="ghost" onClick={() => setMode('forgot')}>
              Forgot password
            </PortalButton>
            <PortalButton variant="ghost" onClick={() => setMode('reset')}>
              Manual reset
            </PortalButton>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-[#8ea3c4]">
            <ShieldCheck className="h-4 w-4" />
            <span>
              Shared auth foundation with TWA role-based access checks. Current
              auth state: {authStateLabel.replaceAll('_', ' ')}.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
