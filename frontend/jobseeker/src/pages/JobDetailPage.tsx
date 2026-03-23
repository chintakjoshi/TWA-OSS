import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Heart,
  MapPin,
  Navigation,
  NotebookPen,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import { createApplication, getVisibleJobDetail } from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  InlineNotice,
  Modal,
  PanelBody,
  PortalBadge,
  PortalButton,
  PortalPanel,
} from '../components/ui/JobseekerUi'
import { announceComingSoon } from '../lib/comingSoon'
import type { JobDetailPayload } from '../types/jobseeker'

function buildEligibilityMessage(detail: JobDetailPayload) {
  if (detail.eligibility.is_eligible) {
    return 'You appear eligible for this role based on your current profile.'
  }
  if (detail.eligibility.ineligibility_tag) {
    return `This listing is not a fit right now because it is ${detail.eligibility.ineligibility_tag.toLowerCase()}.`
  }
  return 'This listing is not a fit right now based on your current profile.'
}

export function JobseekerJobDetailPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { jobId = '' } = useParams()
  const [detail, setDetail] = useState<JobDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setLoadError(null)
    void getVisibleJobDetail(auth.requestTwa, jobId)
      .then((response) => {
        if (!active) return
        setDetail(response)
      })
      .catch((nextError: Error) => {
        if (!active) return
        setLoadError(nextError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth, jobId])

  async function handleApply() {
    if (!detail) return
    setIsApplying(true)
    setActionError(null)
    setNotice(null)
    try {
      await createApplication(auth.requestTwa, detail.job.id)
      setHasApplied(true)
      setConfirmOpen(false)
      setNotice('Application submitted. You can track it in My Applications.')
      toast.success('Application submitted.', {
        description: 'Your TWA application tracker has been updated.',
      })
    } catch (nextError) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to submit application right now.'
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <JobseekerHeader />

      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 pb-12 sm:px-6">
        <div className="mb-6">
          <PortalButton variant="ghost" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </PortalButton>
        </div>

        {isLoading ? <LoadingState title="Loading job details..." /> : null}
        {!isLoading && loadError ? (
          <ErrorState title="Job unavailable" message={loadError} />
        ) : null}

        {!isLoading && !loadError && detail ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <PortalPanel>
              <PanelBody className="space-y-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Job details
                    </p>
                    <h1 className="jobseeker-display mt-3 text-[3rem] leading-[0.98] font-semibold text-slate-950">
                      {detail.job.title}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#d0922c]" />
                        {detail.job.city ?? 'City not set'}
                        {detail.job.zip ? `, ${detail.job.zip}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-[#3569c7]" />
                        {detail.job.transit_required === 'own_car'
                          ? 'Own car required'
                          : 'Transit friendly'}
                      </span>
                    </div>
                  </div>
                  <PortalBadge
                    tone={
                      detail.eligibility.is_eligible ? 'success' : 'warning'
                    }
                  >
                    {detail.eligibility.is_eligible
                      ? 'Eligible'
                      : (detail.eligibility.ineligibility_tag ??
                        'Not eligible')}
                  </PortalBadge>
                </div>

                {notice ? (
                  <InlineNotice tone="success">{notice}</InlineNotice>
                ) : null}
                {actionError ? (
                  <InlineNotice tone="danger">{actionError}</InlineNotice>
                ) : null}

                <InlineNotice
                  tone={detail.eligibility.is_eligible ? 'success' : 'info'}
                >
                  {buildEligibilityMessage(detail)}
                </InlineNotice>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      About the role
                    </p>
                    <p className="text-sm leading-7 text-slate-600">
                      {detail.job.description ?? 'No description provided yet.'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Location
                    </p>
                    <p className="text-sm leading-7 text-slate-600">
                      {detail.job.location_address ?? 'Address not provided'}
                      {detail.job.city ? `, ${detail.job.city}` : ''}
                      {detail.job.zip ? ` ${detail.job.zip}` : ''}
                    </p>
                  </div>
                </div>

                <PortalPanel className="border-[#eadfce] bg-[#fcfaf6] shadow-none">
                  <PanelBody className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Transit details
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Requirement
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {detail.job.transit_required === 'own_car'
                            ? 'This listing requires access to a personal vehicle.'
                            : 'This listing accepts public transit and other reachable options.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Accessibility
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {detail.job.transit_accessible === null
                            ? 'Transit accessibility has not been computed yet.'
                            : detail.job.transit_accessible
                              ? 'Transit access has been marked available for this listing.'
                              : 'Transit access is not currently available for this listing.'}
                        </p>
                      </div>
                    </div>
                  </PanelBody>
                </PortalPanel>
              </PanelBody>
            </PortalPanel>

            <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <PortalPanel>
                <PanelBody className="space-y-5">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#e6dac7] bg-[#f9f4eb] text-xl font-semibold text-[#132130]">
                    {detail.job.title.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                      Apply
                    </p>
                    <h2 className="jobseeker-display mt-2 text-[2rem] font-semibold text-slate-950">
                      Review before you submit.
                    </h2>
                  </div>
                  <p className="text-sm leading-7 text-slate-500">
                    Applying sends a notification into the TWA workflow so your
                    current application can be tracked.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <PortalButton
                      className="flex-1"
                      disabled={
                        !detail.eligibility.is_eligible ||
                        isApplying ||
                        hasApplied
                      }
                      onClick={() => setConfirmOpen(true)}
                    >
                      {hasApplied
                        ? 'Application submitted'
                        : isApplying
                          ? 'Submitting...'
                          : 'Apply for This Job'}
                    </PortalButton>
                    <PortalButton
                      aria-label="Save this job"
                      variant="secondary"
                      onClick={() => announceComingSoon('Saved jobs')}
                    >
                      <Heart className="h-4 w-4" />
                    </PortalButton>
                  </div>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-transparent bg-transparent px-4 text-sm font-semibold text-slate-600 transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60"
                    to="/applications"
                  >
                    View My Applications
                  </Link>
                </PanelBody>
              </PortalPanel>

              <PortalPanel>
                <PanelBody className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Quick notes
                  </p>
                  <div className="flex items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-4 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 text-[#2f7d4b]" />
                    Your profile stays private to the TWA workflow. Job detail
                    eligibility here does not expose sensitive background
                    reasons.
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-4 text-sm text-slate-600">
                    <NotebookPen className="mt-0.5 h-4 w-4 text-[#d0922c]" />
                    Keep your profile current before applying so staff matching
                    stays accurate.
                  </div>
                </PanelBody>
              </PortalPanel>
            </div>
          </div>
        ) : null}
      </main>

      <Modal
        open={confirmOpen}
        title="Confirm your application"
        onClose={() => setConfirmOpen(false)}
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eef6ff] text-[#2458b8]">
            <NotebookPen className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm leading-7 text-slate-500">
              Your TWA application tracker will be updated when you submit this
              application.
            </p>
            <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-3 font-medium text-slate-700">
              {detail?.job.title}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <PortalButton
              className="flex-1"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </PortalButton>
            <PortalButton
              className="flex-1"
              disabled={isApplying}
              onClick={() => void handleApply()}
            >
              {isApplying ? 'Submitting...' : 'Submit Application'}
            </PortalButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
