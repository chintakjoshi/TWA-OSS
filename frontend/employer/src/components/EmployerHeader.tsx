import { NavLink } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Badge, Button, Card, CardBody } from '@shared/ui/primitives'

function navClassName(isActive: boolean): string {
  return isActive ? 'button button-primary shell-nav-link' : 'button button-secondary shell-nav-link'
}

export function EmployerHeader() {
  const auth = useAuth()
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const tone = reviewStatus === 'approved' ? 'success' : reviewStatus === 'rejected' ? 'danger' : 'warning'

  return (
    <Card className="employer-shell-header" strong>
      <CardBody className="employer-shell-header-body">
        <div className="stack-sm">
          <p className="portal-eyebrow">TWA Employer Workspace</p>
          <h1>Manage your profile, listings, and applicants.</h1>
          <p className="portal-copy">Signed in as {auth.authMe?.app_user?.email}</p>
        </div>
        <div className="employer-shell-actions">
          <Badge tone={tone}>{reviewStatus}</Badge>
          <nav className="employer-shell-nav" aria-label="Employer workspace">
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/dashboard">Dashboard</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/profile">Profile</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/listings">Listings</NavLink>
            <NavLink className={({ isActive }) => navClassName(isActive)} to="/listings/new">New Listing</NavLink>
          </nav>
          <Button tone="ghost" onClick={() => void auth.logout()}>Sign out</Button>
        </div>
      </CardBody>
    </Card>
  )
}
