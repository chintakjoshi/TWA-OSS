import { Link } from 'react-router-dom'

import { Card, CardBody } from '@shared/ui/primitives'

import { adminAppUrl, employerAppUrl } from '../app/authClient'

const highlights = [
  'Profile-first flow so matching logic has complete data before browsing and applying.',
  'Eligibility shown clearly without exposing charge-based private reasoning to jobseekers.',
  'Applications tracked in one place once the profile and local role checks pass.',
]

export function JobseekerLandingPage() {
  return (
    <div className="app-page welcome-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">TWA</span>
          <span className="brand-copy">
            <strong>Transformative Workforce Academy</strong>
            <span>Jobseeker entry</span>
          </span>
        </a>
        <nav className="topnav" aria-label="Primary">
          <Link to="/auth">Jobseeker sign in</Link>
          <a href={employerAppUrl}>Apply as an Employer</a>
          <a className="staff-link" href={adminAppUrl}>
            Staff sign in
          </a>
        </nav>
      </header>

      <main className="page-frame stack-md">
        <section className="hero" id="top">
          <Card className="hero-copy" strong>
            <CardBody className="stack-md">
              <div className="stack-sm">
                <p className="eyebrow">Jobseeker Portal</p>
                <h1>
                  Build your profile, browse matched listings, and apply with
                  more clarity.
                </h1>
                <p className="hero-text">
                  The Phase 13B jobseeker app now covers the real path: sign in,
                  bootstrap, complete the TWA profile, browse open jobs, review
                  details, and track applications.
                </p>
              </div>
              <div className="hero-actions">
                <Link className="button button-primary" to="/auth">
                  Start as a Jobseeker
                </Link>
                <a className="button button-secondary" href={employerAppUrl}>
                  Employer Portal
                </a>
              </div>
            </CardBody>
          </Card>

          <Card className="hero-panel" dark>
            <CardBody className="stack-md">
              <p className="panel-label">What 13B Adds</p>
              <ul className="panel-list">
                {highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      </main>
    </div>
  )
}
