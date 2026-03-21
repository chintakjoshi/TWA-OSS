import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthConsole } from '@shared/auth/AuthConsole'
import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { Badge, Button, Card, CardBody, Field } from '@shared/ui/primitives'

const portalChecks = [
  'Shared authSDK login, signup, email verification resend, OTP, refresh, logout, and password reset are available here.',
  'Employer bootstrap collects the organization details TWA needs to create the local employer record.',
  'Once bootstrapped, the portal routes employers into dashboard, profile, listings, and applicants workflows.',
]

function EmployerBootstrapCard() {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)

  return (
    <Card strong>
      <CardBody className="stack-md">
        <div
          className="cluster"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div className="stack-sm">
            <p className="portal-eyebrow">Local Bootstrap</p>
            <h2 className="card-title">Create the TWA employer account.</h2>
            <p className="card-copy">
              This is the TWA-specific step after authSDK authentication.
            </p>
          </div>
          <Badge tone="warning">Bootstrap required</Badge>
        </div>
        <form
          className="stack-md"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setBusy(true)
            void auth
              .bootstrapRole({
                role: 'employer',
                employer_profile: {
                  org_name: String(form.get('org_name') ?? ''),
                  contact_name: String(form.get('contact_name') ?? ''),
                  phone: String(form.get('phone') ?? ''),
                },
              })
              .finally(() => setBusy(false))
          }}
        >
          <Field label="Organization name">
            <input name="org_name" required />
          </Field>
          <Field label="Contact name">
            <input name="contact_name" />
          </Field>
          <Field label="Phone">
            <input name="phone" />
          </Field>
          <Button disabled={busy} type="submit">
            {busy ? 'Bootstrapping...' : 'Bootstrap as Employer'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

export function EmployerAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const reviewTone =
    reviewStatus === 'approved'
      ? 'success'
      : reviewStatus === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <div className="auth-portal-shell employer-auth-shell">
      <main className="page-frame stack-md">
        <AuthConsole
          title="Sign in, then connect your account to TWA as an employer."
          summary="The shared auth layer handles credential flows while this portal adds the employer-specific bootstrap payload TWA requires."
          supportPoints={portalChecks}
        >
          <div className="stack-md">
            <Card strong>
              <CardBody className="stack-md">
                <p className="card-copy">
                  Current state:{' '}
                  <strong>{authStateLabel.replaceAll('_', ' ')}</strong>
                </p>
              </CardBody>
            </Card>
            {!auth.authMe?.app_user ? <EmployerBootstrapCard /> : null}

            {auth.authMe?.app_user?.app_role === 'employer' ? (
              <Card strong>
                <CardBody className="stack-md">
                  <div
                    className="cluster"
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="stack-sm">
                      <p className="portal-eyebrow">Employer session</p>
                      <h2 className="card-title">
                        Your employer workspace is ready.
                      </h2>
                      <p className="card-copy">
                        The dashboard will show whether you are still waiting
                        for staff approval or can start posting listings.
                      </p>
                    </div>
                    <Badge tone={reviewTone}>{reviewStatus}</Badge>
                  </div>
                  <div className="inline-actions">
                    <Link className="button button-primary" to="/dashboard">
                      Open dashboard
                    </Link>
                    <Button tone="secondary" onClick={() => void auth.logout()}>
                      Sign out
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>
        </AuthConsole>
      </main>
    </div>
  )
}
