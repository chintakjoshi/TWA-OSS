import { Link } from 'react-router-dom'

import { AuthConsole } from '@shared/auth/AuthConsole'
import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { Badge, Button, Card, CardBody } from '@shared/ui/primitives'

const adminFocus = [
  'Staff sign-in runs through the same shared authSDK flow as the public apps.',
  'Only locally provisioned TWA staff accounts can enter the admin workspace.',
  'Once signed in, the portal exposes dashboard, queues, matches, applications, notifications, and audit tools.',
]

export function AdminAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)

  return (
    <div className="auth-portal-shell admin-auth-shell">
      <main className="page-frame stack-md">
        <AuthConsole
          allowSignup={false}
          title="Staff sign-in uses the shared auth foundation."
          summary="Staff accounts are created internally, so this app supports sign-in and recovery but not public self-signup."
          supportPoints={adminFocus}
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
            {!auth.authMe?.app_user ? (
              <Card strong>
                <CardBody className="stack-md">
                  <p className="eyebrow">Provisioned internally</p>
                  <h2 className="card-title">Staff bootstrap is not public.</h2>
                  <p className="card-copy">
                    If you can authenticate through authSDK but still have no
                    local TWA staff record, the team needs to provision the
                    account.
                  </p>
                </CardBody>
              </Card>
            ) : null}
            {auth.authMe?.app_user?.app_role === 'staff' ? (
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
                      <p className="eyebrow">Staff session</p>
                      <h2 className="card-title">Admin role confirmed.</h2>
                      <p className="card-copy">
                        The operational workspace is ready behind this route
                        guard.
                      </p>
                    </div>
                    <Badge tone="success">staff</Badge>
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
