import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Card, CardBody } from '@shared/ui/primitives'

import { getMyEmployerProfile, listEmployerListings } from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import { ListingCard } from '../components/ListingCard'
import type { EmployerProfile, JobListing } from '../types/employer'

export function EmployerDashboardPage() {
  const auth = useAuth()
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [listings, setListings] = useState<JobListing[]>([])
  const [listingTotal, setListingTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const reviewTone = reviewStatus === 'approved' ? 'success' : reviewStatus === 'rejected' ? 'danger' : 'warning'

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void Promise.all([
      getMyEmployerProfile(auth.requestTwa),
      listEmployerListings(auth.requestTwa, { page: 1 }),
    ])
      .then(([profileResponse, listingResponse]) => {
        if (!active) return
        setProfile(profileResponse.employer)
        setListings(listingResponse.items.slice(0, 3))
        setListingTotal(listingResponse.meta.total_items)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setError(nextError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth])

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />
      {isLoading ? <LoadingState title="Loading employer dashboard..." /> : null}
      {!isLoading && error ? <ErrorState title="Dashboard unavailable" message={error} /> : null}
      {!isLoading && !error ? (
        <>
          <Card strong>
            <CardBody className="stack-md">
              <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stack-sm">
                  <p className="portal-eyebrow">Dashboard</p>
                  <h2 className="card-title">Staff review status drives what happens next.</h2>
                  <p className="portal-copy">This dashboard is the employer home base for profile status, listing submission readiness, and applicants visibility.</p>
                </div>
                <Badge tone={reviewTone}>{reviewStatus}</Badge>
              </div>

              {reviewStatus === 'pending' ? <Alert tone="warning"><p>Your employer account is still pending review. You can complete your profile now, but listing submission will stay locked until staff approves the account.</p></Alert> : null}
              {reviewStatus === 'rejected' ? <Alert tone="danger"><p>Your employer account was rejected. Review the staff note and update your profile before asking for reassessment.</p></Alert> : null}
              {reviewStatus === 'approved' ? <Alert tone="success"><p>Your employer account is approved. You can now submit listings and review applicants when sharing is enabled.</p></Alert> : null}
              {profile?.review_note ? <Alert tone={reviewStatus === 'rejected' ? 'danger' : 'info'}><p>{profile.review_note}</p></Alert> : null}

              <div className="dashboard-grid">
                <Card>
                  <CardBody className="stack-sm">
                    <p className="eyebrow">Organization</p>
                    <h3 className="dashboard-stat">{profile?.org_name ?? 'Employer profile'}</h3>
                    <p className="card-copy">Keep the profile current so staff can reassess it whenever needed.</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="stack-sm">
                    <p className="eyebrow">Listings in system</p>
                    <h3 className="dashboard-stat">{listingTotal}</h3>
                    <p className="card-copy">Approved, pending, and rejected listings all stay visible here for tracking.</p>
                  </CardBody>
                </Card>
              </div>

              {auth.authMe?.employer_review_status === 'approved' ? (
                <div className="inline-actions">
                  <Link className="button button-primary" to="/listings/new">Submit a new listing</Link>
                  <Link className="button button-secondary" to="/listings">View my listings</Link>
                </div>
              ) : (
                <div className="inline-actions">
                  <Link className="button button-secondary" to="/profile">Review employer profile</Link>
                </div>
              )}
            </CardBody>
          </Card>

          {listings.length > 0 ? (
            <Card strong>
              <CardBody className="stack-md">
                <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stack-sm">
                    <p className="portal-eyebrow">Recent Listings</p>
                    <h2 className="card-title">Keep an eye on your latest submissions.</h2>
                  </div>
                  <Link className="button button-secondary" to="/listings">See all listings</Link>
                </div>
                <div className="listing-grid">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing}>
                      <Link className="button button-secondary" to={`/listings/${listing.id}`}>Open listing</Link>
                      <Link className="button button-ghost" to={`/listings/${listing.id}/applicants`}>Applicants</Link>
                    </ListingCard>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
