import { useEffect, useMemo, useState } from 'react'
import { Building2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthErrorMessage } from '@shared/auth/errorMessage'
import { OtpCodeInput } from '@shared/auth/OtpCodeInput'
import { isCompleteOtpCode } from '@shared/auth/otp'
import { HttpError } from '@shared/lib/http'

import { jobseekerAppUrl } from '../app/authClient'
import {
  InlineNotice,
  PortalBadge,
  PortalButton,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'

type AuthMode = 'login' | 'signup' | 'forgot' | 'otp' | 'verify'

const authInputClassName =
  'min-h-12 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-[0.95rem] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition placeholder:text-slate-400 focus:border-[#d0922c] focus:ring-4 focus:ring-[#d0922c]/10'

const authLabelClassName =
  'block text-xs font-semibold uppercase tracking-[0.18em] text-slate-700'

function getErrorMessage(error: unknown) {
  return getAuthErrorMessage(error)
}

export function EmployerAuthPage() {
  const auth = useAuth()
  const [mode, setMode] = useState<AuthMode>(
    auth.state === 'otp_required' ? 'otp' : 'login'
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  )
  const [otpCode, setOtpCode] = useState('')

  useEffect(() => {
    if (auth.state === 'otp_required') setMode('otp')
  }, [auth.state])

  const authenticatedEmployer = auth.authMe?.app_user?.app_role === 'employer'
  const title = useMemo(() => {
    if (mode === 'signup') return 'Create your employer account'
    if (mode === 'forgot') return 'Reset your password'
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
    <div className="min-h-screen bg-[#f7f1e5] lg:grid lg:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
      <aside className="employer-grid-surface bg-[#132130] px-8 py-12 text-white xl:px-10 xl:py-16">
        <div className="flex h-full flex-col justify-center">
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

          <div className="mt-16 max-w-[360px] lg:mt-20">
            <h1 className="employer-display text-[clamp(2.8rem,4.2vw,4.1rem)] leading-[0.98] font-semibold">
              Build a stronger workforce with{' '}
              <span className="text-[#f3ac34] italic">fair-chance</span> talent.
            </h1>
            <p className="mt-6 max-w-[330px] text-[1.02rem] leading-8 text-[#aebfd6]">
              Join Missouri employers using TWA to open vetted opportunities,
              review listing approvals, and connect with motivated candidates.
            </p>
          </div>
        </div>
      </aside>

      <main className="employer-auth-pattern flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-[620px] rounded-[32px] border border-[#e4d8c6] bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <PortalBadge tone="warning" className="mb-8">
            Employer Access
          </PortalBadge>

          <h2 className="employer-display text-[2.9rem] leading-[0.98] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Sign in with your credentials, and complete organization setup.
          </p>

          <div className="mt-8 space-y-4">
            {notice ? (
              <InlineNotice tone="success">{notice}</InlineNotice>
            ) : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
          </div>

          {!authenticatedEmployer ? (
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
                    })
                  }}
                >
                  <div>
                    <label className={authLabelClassName}>Work email</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8ea3c4]">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        className={`${authInputClassName} pl-11`}
                        name="email"
                        placeholder="you@yourcompany.com"
                        required
                        type="email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={authLabelClassName}>Password</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8ea3c4]">
                        <LockKeyhole className="h-4 w-4" />
                      </span>
                      <input
                        className={`${authInputClassName} pl-11 pr-11`}
                        minLength={8}
                        name="password"
                        placeholder="Your password"
                        required
                        type={showLoginPassword ? 'text' : 'password'}
                      />
                      <button
                        aria-label={
                          showLoginPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-700 focus-visible:outline-none"
                        type="button"
                        onClick={() =>
                          setShowLoginPassword((current) => !current)
                        }
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="text-sm font-semibold text-[#d0922c]"
                      type="button"
                      onClick={() => setMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <PortalButton
                    className="w-full"
                    disabled={busy}
                    type="submit"
                  >
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
                        'Account created. Check your email to verify it before signing in.'
                      )
                    })
                  }}
                >
                  <div>
                    <label className={authLabelClassName}>Work email</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8ea3c4]">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        className={`${authInputClassName} pl-11`}
                        name="email"
                        placeholder="you@yourcompany.com"
                        required
                        type="email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={authLabelClassName}>Password</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8ea3c4]">
                        <LockKeyhole className="h-4 w-4" />
                      </span>
                      <input
                        className={`${authInputClassName} pl-11 pr-11`}
                        minLength={8}
                        name="password"
                        placeholder="Create a secure password"
                        required
                        type={showSignupPassword ? 'text' : 'password'}
                      />
                      <button
                        aria-label={
                          showSignupPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-700 focus-visible:outline-none"
                        type="button"
                        onClick={() =>
                          setShowSignupPassword((current) => !current)
                        }
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <PortalButton
                    className="w-full"
                    disabled={busy}
                    type="submit"
                  >
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
                        'If that account exists, a reset link has been sent.'
                      )
                    })
                  }}
                >
                  <div>
                    <label className={authLabelClassName}>Work email</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8ea3c4]">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        className={`${authInputClassName} pl-11`}
                        name="email"
                        required
                        type="email"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PortalButton disabled={busy} type="submit">
                      {busy ? 'Sending...' : 'Send reset email'}
                    </PortalButton>
                    <PortalButton
                      variant="secondary"
                      onClick={() => setMode('login')}
                    >
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
                    void run(async () => {
                      if (!isCompleteOtpCode(otpCode)) {
                        throw new Error('Enter the 6-digit OTP code.')
                      }
                      await auth.verifyLoginOtp({
                        challenge_token: auth.otpChallenge!.challenge_token,
                        code: otpCode,
                      })
                      setOtpCode('')
                      setNotice('OTP verified. Continue into employer setup.')
                    })
                  }}
                >
                  <InlineNotice tone="info">
                    Enter the code sent to {auth.otpChallenge.masked_email}.
                  </InlineNotice>
                  <div>
                    <label className={authLabelClassName}>OTP code</label>
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
                      We sent a confirmation link to your work email. Activate
                      the account, then return here to continue employer setup.
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
                        setNotice(
                          'Once your email is verified, sign in to continue.'
                        )
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
            <a
              className="font-semibold text-[#b77712] underline decoration-2 underline-offset-4 transition hover:text-[#8f5b08]"
              href={jobseekerAppUrl}
            >
              Jobseeker Portal
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
