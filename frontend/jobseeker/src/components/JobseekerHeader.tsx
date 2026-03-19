import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Badge, Button, Card, CardBody } from '@shared/ui/primitives'

function navClassName(isActive: boolean): string {
  return isActive ? 'button button-primary shell-nav-link' : 'button button-secondary shell-nav-link'
}

export function JobseekerHeader() {
  const auth = useAuth()
  const profileTone = auth.authMe?.profile_complete ? 'success' : 'warning'

  return (
    <Card className="jobseeker-shell-header" strong>
      <CardBody className="jobseeker-shell-header-body">
        <div className="stack-sm">
          <p className="eyebrow">TWA Jobseeker Workspace</p>
          <h1 className="card-title">Build your profile, browse jobs, and track applications.</h1>
          <p className="card-copy">Signed in as {auth.authMe?.app_user?.email}</p>
        </div>
        <div className="jobseeker-shell-actions">
          <Badge tone={profileTone}>{auth.authMe?.profile_complete ? 'Profile complete' : 'Profile incomplete'}</Badge>
          <nav className="jobseeker-shell-nav" aria-label="Jobseeker workspace">
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/profile">Profile</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/jobs">Jobs</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/applications">My Applications</NavLink>
          </nav>
          <Button tone="ghost" onClick={() => void auth.logout()}>Sign out</Button>
        </div>
      </CardBody>
    </Card>
  )
}
