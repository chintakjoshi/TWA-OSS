import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Users,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import {
  getMyEmployerProfile,
  listEmployerApplications,
  listEmployerListings,
} from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  PortalBadge,
  PortalButton,
  PortalPanel,
  StatCard,
  Surface,
} from '../components/ui/EmployerUi'
import { announceComingSoon } from '../lib/comingSoon'
import { isEmployerApplicantVisibilityEnabled } from '../lib/capabilities'
import { formatDate, getStatusTone, isListingVisible } from '../lib/formatting'
import type { EmployerProfile, JobListing } from '../types/employer'

type ApplicantMetrics = {
  applicants: number | null
  hires: number | null
  sharingEnabled: boolean
}

export function EmployerDashboardPage() {
  const auth = useAuth()
  const applicantVisibilityEnabled = isEmployerApplicantVisibilityEnabled(
    auth.authMe
  )
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [listings, setListings] = useState<JobListing[]>([])
  const [listingTotal, setListingTotal] = useState(0)
  const [metrics, setMetrics] = useState<ApplicantMetrics>({
    applicants: null,
    hires: null,
    sharingEnabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    void Promise.all([
      getMyEmployerProfile(auth.requestTwa),
      listEmployerListings(auth.requestTwa, { page: 1, pageSize: 100 }),
    ])
      .then(async ([profileResponse, listingResponse]) => {
        if (!active) return
        const nextProfile = profileResponse.employer
        const nextListings = listingResponse.items
        setProfile(nextProfile)
        setListings(nextListings)
        setListingTotal(listingResponse.meta.total_items)

        if (
          nextProfile.review_status !== 'approved' ||
          !applicantVisibilityEnabled
        ) {
          setMetrics({ applicants: null, hires: null, sharingEnabled: false })
          return
        }

        const visibleListings = nextListings.filter(isListingVisible)
        if (visibleListings.length === 0) {
          setMetrics({ applicants: 0, hires: 0, sharingEnabled: true })
          return
        }

        try {
          const [allApplicants, hiredApplicants] = await Promise.all([
            listEmployerApplications(auth.requestTwa, {
              page: 1,
              pageSize: 1,
            }),
            listEmployerApplications(auth.requestTwa, {
              page: 1,
              pageSize: 1,
              status: 'hired',
            }),
          ])

          if (!active) return
          setMetrics({
            applicants: allApplicants.meta.total_items,
            hires: hiredApplicants.meta.total_items,
            sharingEnabled: true,
          })
        } catch (nextError) {
          if (!active) return
          if (
            nextError instanceof HttpError &&
            nextError.status === 403 &&
            nextError.code === 'APPLICANT_VISIBILITY_DISABLED'
          ) {
            setMetrics({ applicants: null, hires: null, sharingEnabled: false })
            return
          }
          throw nextError
        }
      })
      .catch((nextError: unknown) => {
        if (!active) return
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load the employer dashboard right now.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [applicantVisibilityEnabled, auth.authMe, auth.requestTwa])

  const reviewStatus =
    profile?.review_status ?? auth.authMe?.employer_review_status ?? 'pending'
  const approvedWelcomeLabel = useMemo(() => {
    const contactName = profile?.contact_name?.trim()
    const orgName = profile?.org_name?.trim()
    if (contactName && orgName)
      return `Welcome, ${contactName} from ${orgName}.`
    if (orgName) return `Welcome, ${orgName}.`
    if (contactName) return `Welcome, ${contactName}.`
    return 'Welcome, Employer.'
  }, [profile?.contact_name, profile?.org_name])
  const visibleListings = useMemo(
    () => listings.filter(isListingVisible).length,
    [listings]
  )
  const recentListings = useMemo(() => listings.slice(0, 4), [listings])

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader listingCount={listingTotal} />
      <main className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 lg:px-8">
        {isLoading ? (
          <LoadingState title="Loading employer dashboard..." />
        ) : null}
        {!isLoading && error ? (
          <ErrorState title="Dashboard unavailable" message={error} />
        ) : null}

        {!isLoading && !error ? (
          <>
            <PortalPanel className="overflow-hidden">
              <div
                className={`px-7 py-7 ${
                  reviewStatus === 'approved'
                    ? 'bg-[linear-gradient(135deg,#edf9ef_0%,#daf2df_100%)]'
                    : reviewStatus === 'rejected'
                      ? 'bg-[linear-gradient(135deg,#fff4f2_0%,#ffe6e3_100%)]'
                      : 'bg-[linear-gradient(135deg,#eef5ff_0%,#ddeaff_100%)]'
                }`}
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/60 text-slate-950">
                      {reviewStatus === 'approved' ? (
                        <CheckCircle2 className="h-5 w-5 text-[#2a8150]" />
                      ) : reviewStatus === 'rejected' ? (
                        <XCircle className="h-5 w-5 text-[#c7372e]" />
                      ) : (
                        <Hourglass className="h-5 w-5 text-[#2458b8]" />
                      )}
                    </div>
                    <div className="space-y-3">
                      {reviewStatus !== 'approved' ? (
                        <PortalBadge tone={getStatusTone(reviewStatus)}>
                          Account status:{' '}
                          {reviewStatus === 'rejected'
                            ? 'not approved'
                            : 'pending review'}
                        </PortalBadge>
                      ) : null}
                      <div>
                        <h1 className="employer-display text-[2.3rem] leading-[1.02] font-semibold text-slate-950">
                          {reviewStatus === 'approved'
                            ? approvedWelcomeLabel
                            : reviewStatus === 'rejected'
                              ? 'Your registration was not approved'
                              : 'Your registration is under review'}
                        </h1>
                        {reviewStatus === 'approved' ? null : (
                          <p className="mt-3 max-w-[760px] text-base leading-8 text-slate-600">
                            {reviewStatus === 'rejected'
                              ? 'TWA staff reviewed your employer registration and were unable to approve it at this time. Review the note below and request reassessment after updates.'
                              : 'TWA staff are reviewing your employer registration. Once approved, you will be able to submit listings and access the full employer workflow.'}
                          </p>
                        )}
                      </div>

                      {reviewStatus === 'approved' ? null : (
                        <div className="flex flex-wrap gap-3">
                          {reviewStatus === 'rejected' ? (
                            <>
                              <PortalButton
                                onClick={() =>
                                  announceComingSoon('Request re-review')
                                }
                              >
                                Request Review
                              </PortalButton>
                              <PortalButton
                                variant="secondary"
                                onClick={() => setReasonOpen(true)}
                              >
                                View Reason
                              </PortalButton>
                            </>
                          ) : (
                            <PortalButton
                              variant="secondary"
                              onClick={() =>
                                announceComingSoon('Contact TWA staff')
                              }
                            >
                              Contact TWA Staff
                            </PortalButton>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </PortalPanel>

            <div className="grid gap-5 lg:grid-cols-3">
              <Link
                className="block rounded-[28px] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                to="/my-listings"
              >
                <StatCard
                  accent="#2458b8"
                  hint={
                    reviewStatus === 'approved'
                      ? `${visibleListings} currently visible in TWA`
                      : 'Will unlock after approval'
                  }
                  icon={BriefcaseBusiness}
                  label="Active Listings"
                  value={String(visibleListings)}
                />
              </Link>
              <Link
                className="block rounded-[28px] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                to="/applicants"
              >
                <StatCard
                  accent="#d0922c"
                  hint={
                    metrics.sharingEnabled
                      ? 'Across visible listings'
                      : 'Available when applicant sharing is enabled'
                  }
                  icon={Users}
                  label="Total Applicants"
                  value={
                    metrics.applicants === null
                      ? 'Locked'
                      : String(metrics.applicants)
                  }
                />
              </Link>
              <Link
                className="block rounded-[28px] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                to="/applicants?status=hired"
              >
                <StatCard
                  accent="#2a8150"
                  hint={
                    metrics.hires === null
                      ? 'Shared applicant data required'
                      : 'Recorded in employer applicant feeds'
                  }
                  icon={ClipboardList}
                  label="Hires Via TWA"
                  value={
                    metrics.hires === null ? 'Locked' : String(metrics.hires)
                  }
                />
              </Link>
            </div>

            <PortalPanel>
              <div className="border-b border-[#eadfce] px-6 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
                      Recent listing activity
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review submission timing, status, and which listings are
                      still waiting on staff.
                    </p>
                  </div>
                  <Link to="/my-listings">
                    <PortalButton variant="secondary">
                      All listings
                    </PortalButton>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fbf8f1] text-xs uppercase tracking-[0.16em] text-[#8da2c5]">
                    <tr>
                      <th className="px-6 py-4">Listing</th>
                      <th className="px-6 py-4">Submitted</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentListings.map((listing) => (
                      <tr
                        className="border-t border-[#eadfce] transition hover:bg-[#fcfaf6]"
                        key={listing.id}
                      >
                        <td className="px-6 py-4">
                          <Link
                            className="block"
                            to={`/my-listings/${listing.id}`}
                          >
                            <p className="font-semibold text-slate-950 transition hover:text-[#b77712]">
                              {listing.title}
                            </p>
                            <p className="text-slate-500">
                              {listing.city || 'Location pending'}
                            </p>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(listing.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <PortalBadge
                            tone={getStatusTone(listing.review_status)}
                          >
                            {listing.review_status === 'approved'
                              ? 'Approved'
                              : listing.review_status === 'rejected'
                                ? 'Rejected'
                                : 'Under review'}
                          </PortalBadge>
                        </td>
                        <td className="px-6 py-4">
                          <PortalBadge
                            tone={getStatusTone(listing.lifecycle_status)}
                          >
                            {listing.lifecycle_status === 'open'
                              ? 'Live'
                              : 'Closed'}
                          </PortalBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PortalPanel>

            {reviewStatus === 'rejected' && profile?.review_note ? (
              <Surface className="max-w-[760px]">
                <h2 className="employer-display text-[1.6rem] font-semibold text-slate-950">
                  Rejection details
                </h2>
                <p className="mt-4 rounded-2xl bg-[#fcfaf6] px-4 py-4 text-sm leading-7 text-slate-600">
                  {profile.review_note}
                </p>
              </Surface>
            ) : null}
          </>
        ) : null}
      </main>

      {reasonOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="presentation"
          onClick={() => setReasonOpen(false)}
        >
          <div
            aria-modal="true"
            className="w-full max-w-xl rounded-[28px] border border-[#dacdb8] bg-[#fffdf9] shadow-[0_28px_80px_rgba(15,23,42,0.2)]"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#eadfce] px-6 py-5">
              <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
                Rejection details
              </h2>
            </div>
            <div className="space-y-6 px-6 py-6">
              <p className="text-sm leading-7 text-slate-600">
                {profile?.review_note ??
                  'TWA staff did not include an additional note for this review.'}
              </p>
              <div className="flex justify-end gap-3">
                <PortalButton
                  variant="secondary"
                  onClick={() => setReasonOpen(false)}
                >
                  Close
                </PortalButton>
                <PortalButton
                  onClick={() => announceComingSoon('Request re-review')}
                >
                  Request Re-review
                </PortalButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
