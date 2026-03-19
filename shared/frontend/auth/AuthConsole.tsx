import { useMemo, useState } from 'react'

import { HttpError } from '../lib/http'
import { Alert, Button, Card, CardBody, Field } from '../ui/primitives'
import { useAuth } from './AuthProvider'

export interface AuthConsoleProps {
  title: string
  summary: string
  allowSignup?: boolean
  supportPoints: string[]
  children?: React.ReactNode
}

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'otp'

function errorMessage(error: unknown): string {
  if (error instanceof HttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function AuthConsole({
  title,
  summary,
  allowSignup = true,
  supportPoints,
  children,
}: AuthConsoleProps) {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeMode = auth.state === 'otp_required' ? 'otp' : mode
  const availableModes = useMemo<Mode[]>(
    () =>
      allowSignup
        ? ['login', 'signup', 'forgot', 'reset']
        : ['login', 'forgot', 'reset'],
    [allowSignup]
  )

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await task()
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-grid">
      <Card strong>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="eyebrow">Shared Auth Foundation</p>
            <h1 className="card-title">{title}</h1>
            <p className="card-copy">{summary}</p>
          </div>

          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}
          {notice ? (
            <Alert tone="success">
              <p>{notice}</p>
            </Alert>
          ) : null}

          {auth.state !== 'authenticated' ? (
            <div className="auth-tabs">
              {availableModes.map((candidate: Mode) => (
                <Button
                  key={candidate}
                  tone={activeMode === candidate ? 'primary' : 'secondary'}
                  className={
                    activeMode === candidate
                      ? 'auth-tab auth-tab-active'
                      : 'auth-tab'
                  }
                  onClick={() => setMode(candidate)}
                >
                  {candidate === 'login' && 'Sign In'}
                  {candidate === 'signup' && 'Create Account'}
                  {candidate === 'forgot' && 'Forgot Password'}
                  {candidate === 'reset' && 'Reset Password'}
                </Button>
              ))}
            </div>
          ) : null}

          {activeMode === 'login' ? (
            <form
              className="stack-md"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.login({
                    email: String(form.get('email') ?? ''),
                    password: String(form.get('password') ?? ''),
                  })
                  setNotice('You are signed in through authSDK.')
                })
              }}
            >
              <Field label="Email">
                <input name="email" required type="email" />
              </Field>
              <Field label="Password">
                <input name="password" required type="password" minLength={8} />
              </Field>
              <Button disabled={busy} type="submit">
                {busy ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          ) : null}

          {activeMode === 'signup' && allowSignup ? (
            <form
              className="stack-md"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.signup({
                    email: String(form.get('email') ?? ''),
                    password: String(form.get('password') ?? ''),
                  })
                  setMode('login')
                  setNotice(
                    'Account created in authSDK. Sign in next to continue into TWA.'
                  )
                })
              }}
            >
              <Field label="Email">
                <input name="email" required type="email" />
              </Field>
              <Field label="Password" hint="Use at least 8 characters.">
                <input name="password" required type="password" minLength={8} />
              </Field>
              <Button disabled={busy} type="submit">
                {busy ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          ) : null}

          {activeMode === 'forgot' ? (
            <form
              className="stack-md"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.requestPasswordReset({
                    email: String(form.get('email') ?? ''),
                  })
                  setNotice(
                    'If that email exists, authSDK has sent a password reset link.'
                  )
                })
              }}
            >
              <Field label="Email">
                <input name="email" required type="email" />
              </Field>
              <Button disabled={busy} type="submit">
                {busy ? 'Sending...' : 'Send Reset Email'}
              </Button>
            </form>
          ) : null}

          {activeMode === 'reset' ? (
            <form
              className="stack-md"
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
              <Field
                label="Reset Token"
                hint="Use the token from the authSDK email if you are completing the reset manually."
              >
                <input name="token" required minLength={16} />
              </Field>
              <Field label="New Password">
                <input
                  name="new_password"
                  required
                  type="password"
                  minLength={8}
                />
              </Field>
              <Button disabled={busy} type="submit">
                {busy ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          ) : null}

          {activeMode === 'otp' && auth.otpChallenge ? (
            <form
              className="stack-md"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await auth.verifyLoginOtp({
                    challenge_token: auth.otpChallenge!.challenge_token,
                    code: String(form.get('code') ?? ''),
                  })
                  setNotice('OTP verified. You can continue into TWA now.')
                })
              }}
            >
              <Alert tone="info">
                <p>
                  One more step: enter the code sent to{' '}
                  {auth.otpChallenge.masked_email}.
                </p>
              </Alert>
              <Field label="OTP Code">
                <input
                  name="code"
                  required
                  minLength={4}
                  maxLength={12}
                  inputMode="numeric"
                />
              </Field>
              <div className="inline-actions">
                <Button disabled={busy} type="submit">
                  {busy ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button
                  disabled={busy}
                  tone="secondary"
                  onClick={() => {
                    void run(async () => {
                      await auth.resendLoginOtp()
                      setNotice('A fresh OTP has been sent.')
                    })
                  }}
                >
                  Resend OTP
                </Button>
              </div>
            </form>
          ) : null}

          {auth.state === 'authenticated' ? children : null}
        </CardBody>
      </Card>

      <Card dark>
        <CardBody className="stack-md">
          <div className="stack-sm">
            <p className="eyebrow">What 13A Covers</p>
            <h2 className="card-title">
              Shared auth, shared components, shared API plumbing.
            </h2>
          </div>
          <ul className="auth-support-list">
            {supportPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
