import { Link } from 'react-router-dom'

import { Card, CardBody } from '@shared/ui/primitives'

import { publicAppUrl } from '../app/authClient'

const adminFocus = [
  'Review pending employers and listings without leaving the staff workspace.',
  'Edit jobseeker records, run both match directions, and manage application outcomes.',
  'Control notification behavior and inspect the audit log in the same portal.',
]

export function AdminLandingPage() {
  return (
    <main className="portal-shell portal-shell-admin">
      <Card className="portal-card" strong>
        <CardBody className="stack-md">
          <p className="portal-eyebrow">Staff Admin</p>
          <h1>Operate the full TWA workflow from a dedicated staff console.</h1>
          <p className="portal-copy">
            Phase 13D turns the admin app into the real operational surface for
            approvals, matching, hiring, notifications, and audit history.
          </p>
          <div className="portal-actions">
            <Link className="button button-primary" to="/auth">
              Open staff sign in
            </Link>
            <a className="button button-secondary" href={publicAppUrl}>
              Open welcome page
            </a>
          </div>
        </CardBody>
      </Card>

      <Card className="portal-panel" dark>
        <CardBody className="portal-panel-body">
          <div>
            <p className="portal-label">Staff responsibilities</p>
            <ul className="portal-list">
              {adminFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="portal-meter">
            <span>Operations</span>
            <strong>Review, match, govern</strong>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
