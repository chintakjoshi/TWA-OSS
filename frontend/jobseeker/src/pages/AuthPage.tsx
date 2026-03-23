import { useEffect, useMemo, useState } from 'react'
import { Home, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { HttpError } from '@shared/lib/http'

import { adminAppUrl, employerAppUrl } from '../app/authClient'
import {
  InlineNotice,
  PortalBadge,
  PortalButton,
  inputClassName,
} from '../components/ui/JobseekerUi'
import { announceComingSoon } from '../lib/comingSoon'

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'otp' | 'verify'

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

const supportPoints = [
  'Build your TWA profile before browsing and applying.',
  'See which open listings fit your completed profile.',
  'Track submitted, reviewed, and hired applications in one place.',
  'Stay within the jobseeker path while staff and employer routes remain separate.',
]

export function JobseekerAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)
  const [mode, setMode] = useState<AuthMode>(
    auth.state === 'otp_required' ? 'otp' : 'login'
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [loginReminder, setLoginReminder] = useState(true)

  useEffect(() => {
    if (auth.state === 'otp_required') setMode('otp')
  }, [auth.state])

  const authenticatedJobseeker = auth.authMe?.app_user?.app_role === 'jobseeker'
  const needsBootstrap = auth.state === 'authenticated' && !auth.authMe?.app_user
  const wrongPortal =
    auth.authMe?.app_user && auth.authMe.app_user.app_role !== 'jobseeker'
  const showForms = !authenticatedJobseeker && !needsBootstrap && !wrongPortal

  const title = useMemo(() => {
    if (mode === 'signup') return 'Create your account'
    if (mode === 'forgot') return 'Reset your password'
    if (mode === 'reset') return 'Complete password reset'
    if (mode === 'otp') return 'Verify sign-in'
    if (mode === 'verify') return 'Check your inbox'
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
      <aside className="jobseeker-grid-surface bg-[#132130] px-10 py-12 text-white">
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

          <div className="mt-20 max-w-[380px]">
            <h1 className="jobseeker-display text-[clamp(3rem,5vw,4.6rem)] leading-[0.96] font-semibold">
              Your next <span className="text-[#f3ac34] italic">chapter</span>{' '}
              starts here.
            </h1>
            <p className="mt-8 text-xl leading-9 text-[#aebfd6]">
              TWA connects justice-involved individuals with fair-chance
              opportunities while keeping the profile and application path simple
              and clear.
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
            Use your jobseeker credentials for this portal. Employer and staff
            accounts have separate routes and permissions.
          </div>
        </div>
      </aside>

      <main className="jobseeker-auth-pattern flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[580px] rounded-[32px] border border-[#e4d8c6] bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <PortalBadge tone="warning" className="mb-8">
            Jobseeker Access
          </PortalBadge>

          <h2 className="jobseeker-display text-[3rem] leading-[0.98] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Sign in with your TWA jobseeker credentials.
          </p>

          <div className="mt-8 space-y-4">
            {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            {wrongPortal ? (
              <InlineNotice tone="danger">
                This account is linked to the{' '}
                <strong>{auth.authMe?.app_user?.app_role}</strong> portal, so the
                jobseeker routes stay locked here.
              </InlineNotice>
            ) : null}

            {needsBootstrap ? (
              <InlineNotice tone="info">
                You authenticated successfully, but your local TWA jobseeker
                record still needs to be created.
              </InlineNotice>
            ) : null}
          </div>

          {authenticatedJobseeker ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-[24px] border border-[#d8ccb9] bg-[#fcfaf6] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Session Ready
                    </p>
                    <p className="jobseeker-display mt-2 text-[1.7rem] font-semibold text-slate-950">
                      Your jobseeker workspace is unlocked.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Signed in as {auth.authMe?.app_user?.email}. Auth state:{' '}
                      {authStateLabel.replaceAll('_', ' ')}.
                    </p>
                  </div>
                  <PortalBadge
                    tone={auth.authMe?.profile_complete ? 'success' : 'warning'}
                  >
                    {auth.authMe?.profile_complete
                      ? 'Profile complete'
                      : 'Profile incomplete'}
                  </PortalBadge>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d0922c] bg-[#d0922c] px-4 text-sm font-semibold text-white transition hover:border-[#b67a1b] hover:bg-[#b67a1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                  to={auth.authMe?.profile_complete ? '/jobs' : '/profile'}
                >
                  {auth.authMe?.profile_complete ? 'Go to jobs' : 'Complete profile'}
                </Link>
                <PortalButton variant="secondary" onClick={() => void auth.logout()}>
                  Sign out
                </PortalButton>
              </div>
            </div>
          ) : null}

          {needsBootstrap ? (
            <div className="mt-8 rounded-[24px] border border-[#d8ccb9] bg-[#fcfaf6] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                Local Bootstrap
              </p>
              <h3 className="jobseeker-display mt-3 text-[1.7rem] font-semibold text-slate-950">
                Create your local TWA jobseeker record.
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Shared auth signs you in first. The button below creates the local
                TWA jobseeker account the rest of the portal expects.
              </p>
              <div className="mt-6">
                <PortalButton
                  disabled={busy}
                  onClick={() => {
                    void run(async () => {
                      await auth.bootstrapRole({ role: 'jobseeker' })
                      setNotice('Your local TWA jobseeker record is ready.')
                    })
                  }}
                >
                  Bootstrap as Jobseeker
                </PortalButton>
              </div>
            </div>
          ) : null}

          {showForms ? (
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
                  Create Account
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
                            'Verify your email before signing in. You can resend the verification email below.'
                          )
                          return
                        }
                        throw nextError
                      }
                      if (loginReminder) {
                        setNotice('Signed in through the shared auth service.')
                      }
                    })
                  }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Email address
                    </label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ea3c4]" />
                      <input
                        className={`${inputClassName} pl-12`}
                        name="email"
                        placeholder="you@example.com"
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
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        checked={loginReminder}
                        className="h-4 w-4 rounded border-[#d8ccb9]"
                        type="checkbox"
                        onChange={(event) => setLoginReminder(event.target.checked)}
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
                        'Account created in the shared auth service. Check your email to verify the account before signing in.'
                      )
                    })
                  }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Email address
                    </label>
                    <input
                      className={inputClassName}
                      name="email"
                      placeholder="you@example.com"
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
                    {busy ? 'Creating account...' : 'Create My Account'}
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
                      Email address
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
                    <input
                      className={inputClassName}
                      minLength={16}
                      name="token"
                      required
                    />
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
                      setNotice(
                        'OTP verified. You can continue into the jobseeker portal.'
                      )
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
                      maxLength={12}
                      minLength={4}
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
                    <h3 className="jobseeker-display mt-6 text-[2rem] font-semibold text-slate-950">
                      Check your inbox
                    </h3>
                    <p className="mx-auto mt-4 max-w-[380px] text-sm leading-7 text-slate-500">
                      We sent a verification link to your email. Click the link to
                      confirm your address, then return here to continue setting up
                      your account.
                    </p>
                    <div className="mt-6 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 font-medium text-slate-700">
                      {verificationEmail ?? 'your@email.com'}
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

          {!authenticatedJobseeker ? (
            <>
              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#eadfce]" />
                <span className="text-sm text-slate-400">or</span>
                <div className="h-px flex-1 bg-[#eadfce]" />
              </div>

              <PortalButton
                className="w-full"
                icon={Home}
                variant="secondary"
                onClick={() => announceComingSoon('SLU Single Sign-On')}
              >
                Sign in with SLU Single Sign-On
              </PortalButton>

              <p className="mt-8 text-center text-sm text-slate-400">
                Looking for another experience? Visit the{' '}
                <a className="font-semibold text-[#d0922c]" href={employerAppUrl}>
                  Employer Portal
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
                  Create account
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
                <span>Shared auth foundation with TWA role-based access checks.</span>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
