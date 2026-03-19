import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Badge, Button, Card, CardBody } from '@shared/ui/primitives'

function navClassName(isActive: boolean): string {
  return isActive ? 'button button-primary shell-nav-link' : 'button button-secondary shell-nav-link'
}

export function AdminHeader() {
  const auth = useAuth()

  return (
    <Card className="admin-shell-header" strong>
      <CardBody className="admin-shell-header-body">
        <div className="stack-sm">
          <p className="portal-eyebrow">TWA Staff Console</p>
          <h1>Review, decide, match, notify, and audit.</h1>
          <p className="portal-copy">Signed in as {auth.authMe?.app_user?.email}</p>
        </div>
        <div className="admin-shell-actions">
          <Badge tone="info">staff</Badge>
          <nav className="admin-shell-nav" aria-label="Staff workspace">
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/dashboard">Dashboard</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/employers">Employers</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/listings">Listings</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/jobseekers">Jobseekers</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/matches">Matches</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/applications">Applications</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/notifications">Notifications</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/audit">Audit</NavLink>
          </nav>
          <Button tone="ghost" onClick={() => void auth.logout()}>Sign out</Button>
        </div>
      </CardBody>
    </Card>
  )
}
