import { Link } from 'react-router-dom'

import { Card, CardBody } from '@shared/ui/primitives'

import { publicAppUrl } from '../app/authClient'

const portalChecks = [
  'Create the employer account through authSDK, then connect it to TWA with employer bootstrap.',
  'Track staff review status clearly before attempting to submit listings.',
  'When staff enables applicant sharing, review applicants and charge-field data directly in the employer portal.',
]

export function EmployerLandingPage() {
  return (
    <main className="portal-shell portal-shell-employer">
      <Card className="portal-card" strong>
        <CardBody className="stack-md">
          <p className="portal-eyebrow">Employer Portal</p>
          <h1>Hire through a reviewed, staff-supported TWA workflow.</h1>
          <p className="portal-copy">Phase 13C turns the employer app into a real workflow: auth, employer profile, approval status, listing submission, listing monitoring, and applicants when sharing is enabled.</p>
          <div className="portal-actions">
            <Link className="button button-primary" to="/auth">Open employer auth flow</Link>
            <a className="button button-secondary" href={publicAppUrl}>Back to Welcome Page</a>
          </div>
        </CardBody>
      </Card>

      <Card className="portal-panel" dark>
        <CardBody className="portal-panel-body">
          <div>
            <p className="portal-label">What 13C adds</p>
            <ul className="portal-list">{portalChecks.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="portal-meter"><span>Employer flow</span><strong>Review, post, monitor</strong></div>
        </CardBody>
      </Card>
    </main>
  )
}
