import { Link } from 'react-router-dom'

import { AuthConsole } from '@shared/auth/AuthConsole'
import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthStateLabel } from '@shared/lib/auth-client'
import { Badge, Button, Card, CardBody } from '@shared/ui/primitives'

const highlights = [
  'Direct authSDK sign-in, signup, OTP, refresh, logout, and password reset all live here.',
  'Bootstrap into TWA happens after auth and creates the local jobseeker account the backend expects.',
  'Once the profile is complete, the UI unlocks jobs and applications routes instead of letting the backend surprise the user with a block.',
]

export function JobseekerAuthPage() {
  const auth = useAuth()
  const authStateLabel = getAuthStateLabel(auth.authMe)

  return (
    <div className="app-page auth-screen jobseeker-auth-screen">
      <main className="page-frame stack-md">
        <AuthConsole
          title="Sign in and move into the TWA jobseeker path."
          summary="This auth screen talks directly to authSDK, then checks the TWA backend for local bootstrap and profile state."
          supportPoints={highlights}
        >
          <div className="stack-md">
            <Card strong>
              <CardBody className="stack-md">
                <p className="card-copy">Current state: <strong>{authStateLabel.replaceAll('_', ' ')}</strong></p>
              </CardBody>
            </Card>

            {!auth.authMe?.app_user ? (
              <Card strong>
                <CardBody className="stack-md">
                  <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stack-sm">
                      <p className="eyebrow">Local Bootstrap</p>
                      <h2 className="card-title">Create your local TWA jobseeker record.</h2>
                      <p className="card-copy">authSDK signs you in first. TWA bootstrap is the second step that creates your local jobseeker account.</p>
                    </div>
                    <Badge tone="warning">Bootstrap required</Badge>
                  </div>
                  <div className="inline-actions">
                    <Button onClick={() => { void auth.bootstrapRole({ role: 'jobseeker' }) }}>Bootstrap as Jobseeker</Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {auth.authMe?.app_user?.app_role === 'jobseeker' ? (
              <Card strong>
                <CardBody className="stack-md">
                  <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stack-sm">
                      <p className="eyebrow">Session Ready</p>
                      <h2 className="card-title">Your jobseeker workspace is unlocked.</h2>
                      <p className="card-copy">Complete your profile first, then move into the job board and application tracker.</p>
                    </div>
                    <Badge tone={auth.authMe.profile_complete ? 'success' : 'warning'}>{auth.authMe.profile_complete ? 'Profile complete' : 'Profile incomplete'}</Badge>
                  </div>
                  <div className="inline-actions">
                    <Link className="button button-primary" to={auth.authMe.profile_complete ? '/jobs' : '/profile'}>
                      {auth.authMe.profile_complete ? 'Go to jobs' : 'Complete profile'}
                    </Link>
                    <Button tone="secondary" onClick={() => void auth.logout()}>Sign out</Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {auth.authMe?.app_user?.app_role && auth.authMe.app_user.app_role !== 'jobseeker' ? (
              <Card strong>
                <CardBody className="stack-md">
                  <p className="eyebrow">Wrong portal</p>
                  <h2 className="card-title">This account is tied to a different TWA role.</h2>
                  <p className="card-copy">Use the matching portal for {auth.authMe.app_user.app_role} accounts, or contact staff if the role is wrong.</p>
                </CardBody>
              </Card>
            ) : null}
          </div>
        </AuthConsole>
      </main>
    </div>
  )
}
