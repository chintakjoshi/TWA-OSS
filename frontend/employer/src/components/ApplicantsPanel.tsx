import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { HttpError } from '@shared/lib/http'

import { listEmployerApplicants } from '../api/employerApi'
import { announceComingSoon } from '../lib/comingSoon'
import {
  formatChargeFlags,
  formatDate,
  formatStatusLabel,
  formatTransitType,
  getApplicationTone,
  getInitials,
} from '../lib/formatting'
import type { EmployerApplicant } from '../types/employer'
import { EmptyState, LoadingState } from './PageState'
import {
  InlineNotice,
  PortalBadge,
  PortalButton,
  PortalPanel,
} from './ui/EmployerUi'

export function ApplicantsPanel({
  listingId,
  title = 'Applicants matched to this listing',
  description = 'TWA staff controls whether applicant sharing is enabled for employers.',
}: {
  listingId: string
  title?: string
  description?: string
}) {
  const auth = useAuth()
  const reviewStatus = auth.authMe?.employer_review_status ?? 'pending'
  const reviewLocked = reviewStatus !== 'approved'
  const [page, setPage] = useState(1)
  const [applicants, setApplicants] = useState<EmployerApplicant[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [applicantVisibilityDisabled, setApplicantVisibilityDisabled] =
    useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setMessage(null)
    setApplicantVisibilityDisabled(false)

    if (reviewLocked) {
      setApplicants([])
      setTotalPages(0)
      setIsLoading(false)
      return () => {
        active = false
      }
    }

    void listEmployerApplicants(auth.requestTwa, listingId, { page })
      .then((response) => {
        if (!active) return
        setApplicants(response.items)
        setTotalPages(response.meta.total_pages)
      })
      .catch((nextError) => {
        if (!active) return
        if (
          nextError instanceof HttpError &&
          nextError.status === 403 &&
          nextError.code === 'APPLICANT_VISIBILITY_DISABLED'
        ) {
          setApplicants([])
          setTotalPages(0)
          setApplicantVisibilityDisabled(true)
          setMessage(nextError.message)
          return
        }

        setApplicants([])
        setTotalPages(0)
        setMessage(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load applicants right now.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.requestTwa, listingId, page, reviewLocked])

  return (
    <PortalPanel>
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
              Applicants
            </p>
            <h2 className="employer-display text-[1.7rem] font-semibold text-slate-950">
              {title}
            </h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          {reviewLocked ? (
            <PortalBadge tone={reviewStatus === 'rejected' ? 'danger' : 'info'}>
              Applicant access locked
            </PortalBadge>
          ) : !applicantVisibilityDisabled ? (
            <PortalBadge tone="success">
              Applicant sharing enabled by TWA
            </PortalBadge>
          ) : null}
        </div>

        {isLoading ? <LoadingState title="Loading applicants..." /> : null}
        {!isLoading && reviewLocked ? (
          <div className="space-y-4 rounded-[24px] border border-[#d7cab4] bg-[#fffdf9] px-6 py-10 text-center">
            <div className="mx-auto inline-flex items-center rounded-full border border-[#d6e2ff] bg-[#f5f8ff] px-4 py-2 text-sm font-semibold text-[#3569c7]">
              Locked
            </div>
            <h3 className="employer-display text-[2rem] font-semibold text-slate-950">
              {reviewStatus === 'rejected'
                ? 'Applicant access is unavailable until re-approval'
                : 'Applicant access unlocks after approval'}
            </h3>
            <p className="mx-auto max-w-[560px] text-sm leading-7 text-slate-500">
              {reviewStatus === 'rejected'
                ? 'TWA staff removed employer approval for this account. Applicant information stays hidden until the employer account is approved again.'
                : 'TWA staff are still reviewing this employer account. Applicant information becomes available after approval.'}
            </p>
          </div>
        ) : null}
        {!isLoading && applicantVisibilityDisabled ? (
          <div className="space-y-4 rounded-[24px] border border-[#d7cab4] bg-[#fffdf9] px-6 py-10 text-center">
            <div className="mx-auto inline-flex items-center rounded-full border border-[#f3dc9f] bg-[#fff4d7] px-4 py-2 text-sm font-semibold text-[#a86b00]">
              Locked
            </div>
            <h3 className="employer-display text-[2rem] font-semibold text-slate-950">
              Applicant visibility is currently off
            </h3>
            <p className="mx-auto max-w-[560px] text-sm leading-7 text-slate-500">
              {message ??
                'TWA staff control whether employers can view applicant information.'}
            </p>
            <div className="flex justify-center">
              <PortalButton
                variant="secondary"
                onClick={() => announceComingSoon('Applicant sharing preview')}
              >
                Preview with sharing enabled
              </PortalButton>
            </div>
          </div>
        ) : null}
        {!isLoading &&
        !reviewLocked &&
        !applicantVisibilityDisabled &&
        message ? (
          <InlineNotice tone="danger">{message}</InlineNotice>
        ) : null}

        {!isLoading &&
        !reviewLocked &&
        !applicantVisibilityDisabled &&
        applicants.length === 0 &&
        !message ? (
          <EmptyState
            title="No applicants yet"
            message="Once jobseekers apply to this listing, their shared profiles will appear here."
          />
        ) : null}

        {!isLoading &&
        !reviewLocked &&
        !applicantVisibilityDisabled &&
        applicants.length > 0 ? (
          <div className="space-y-4">
            {applicants.map((applicant) => {
              const chargeLabels = formatChargeFlags(
                applicant.jobseeker.charges
              )
              return (
                <div
                  className="flex flex-col gap-4 rounded-[24px] border border-[#e6dbc8] bg-[#fcfaf6] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                  key={applicant.application_id}
                >
                  <div className="flex gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#cbd5f1] bg-[#f2f6ff] text-base font-semibold text-[#2458b8]">
                      {getInitials(applicant.jobseeker.full_name)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xl font-semibold text-slate-950">
                          {applicant.jobseeker.full_name ??
                            'Applicant name pending'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Applied {formatDate(applicant.applied_at)} -{' '}
                          {formatTransitType(applicant.jobseeker.transit_type)}{' '}
                          - {applicant.jobseeker.city ?? 'City pending'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {chargeLabels.length > 0 ? (
                          chargeLabels.map((charge) => (
                            <PortalBadge
                              className="font-medium"
                              key={charge}
                              tone="danger"
                            >
                              {charge}
                            </PortalBadge>
                          ))
                        ) : (
                          <PortalBadge tone="info">No disclosures</PortalBadge>
                        )}
                        <PortalBadge tone="info">
                          {applicant.jobseeker.profile_complete
                            ? 'Profile complete'
                            : 'Profile incomplete'}
                        </PortalBadge>
                        {applicant.jobseeker.phone ? (
                          <PortalBadge tone="neutral">
                            {applicant.jobseeker.phone}
                          </PortalBadge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <PortalBadge tone={getApplicationTone(applicant.status)}>
                      {formatStatusLabel(applicant.status)}
                    </PortalBadge>
                    <PortalButton
                      variant="secondary"
                      onClick={() => announceComingSoon('Express interest')}
                    >
                      Express interest
                    </PortalButton>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {!isLoading &&
        !reviewLocked &&
        !applicantVisibilityDisabled &&
        applicants.length > 0 &&
        totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Applicant page {page} of {totalPages}
            </p>
            <div className="flex flex-wrap gap-3">
              <PortalButton
                disabled={page <= 1}
                variant="secondary"
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </PortalButton>
              <PortalButton
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </PortalButton>
            </div>
          </div>
        ) : null}
      </div>
    </PortalPanel>
  )
}
