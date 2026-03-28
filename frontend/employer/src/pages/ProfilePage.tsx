import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'

import {
  getMyEmployerProfile,
  updateMyEmployerProfile,
} from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { EmployerProfileForm } from '../components/EmployerProfileForm'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  InlineNotice,
  PanelBody,
  PortalBadge,
  PortalButton,
  Surface,
} from '../components/ui/EmployerUi'
import { formatDateTime, getInitials } from '../lib/formatting'
import type { EmployerProfile } from '../types/employer'

export function EmployerProfilePage() {
  const auth = useAuth()
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const reviewStatus =
    profile?.review_status ?? auth.authMe?.employer_review_status ?? 'pending'
  const readOnly = reviewStatus !== 'approved'

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getMyEmployerProfile(auth.requestTwa)
      .then((response) => {
        if (!active) return
        setProfile(response.employer)
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

  async function handleSubmit(
    values: Parameters<typeof updateMyEmployerProfile>[1]
  ) {
    if (readOnly) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await updateMyEmployerProfile(auth.requestTwa, values)
      setProfile(response.employer)
      await auth.reload()
      setSuccess(
        'Employer profile saved. Staff can review the latest details from here.'
      )
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save the employer profile right now.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <EmployerHeader />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 lg:px-8">
        {isLoading ? (
          <LoadingState title="Loading employer profile..." />
        ) : null}
        {!isLoading && error && !profile ? (
          <ErrorState title="Profile unavailable" message={error} />
        ) : null}

        {!isLoading && (!error || profile) ? (
          <>
            <section
              className="overflow-hidden rounded-[28px] border border-[#1f3145] shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              style={{ backgroundColor: '#132130' }}
            >
              <PanelBody className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-5">
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl font-semibold text-white">
                    {getInitials(profile?.contact_name ?? profile?.org_name)}
                  </div>
                  <div>
                    <h1 className="employer-display text-[2.6rem] leading-none font-semibold text-white">
                      {profile?.contact_name ?? 'Employer profile'}
                    </h1>
                    <p className="mt-3 text-sm text-[#cfdbeb]">
                      {profile?.org_name ?? 'Organization pending'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PortalBadge
                        tone={
                          reviewStatus === 'approved'
                            ? 'success'
                            : reviewStatus === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {reviewStatus === 'approved'
                          ? 'Active account'
                          : reviewStatus === 'rejected'
                            ? 'Not approved'
                            : 'Pending review'}
                      </PortalBadge>
                      <PortalBadge tone="info">Employer profile</PortalBadge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <PortalButton
                    variant="secondary"
                    onClick={() => void auth.logout()}
                  >
                    Sign Out
                  </PortalButton>
                </div>
              </PanelBody>
            </section>

            {success ? (
              <InlineNotice tone="success">{success}</InlineNotice>
            ) : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
            {readOnly ? (
              <InlineNotice
                tone={reviewStatus === 'rejected' ? 'danger' : 'info'}
              >
                {reviewStatus === 'rejected'
                  ? 'Your employer account is awaiting re-approval. You can review your current profile here, but edits stay locked until staff approves the account again.'
                  : 'Your employer account is still under review. You can review your current profile here, but edits stay locked until staff approves the account.'}
              </InlineNotice>
            ) : null}
            {profile?.review_note ? (
              <InlineNotice
                tone={reviewStatus === 'rejected' ? 'danger' : 'info'}
              >
                {profile.review_note}
              </InlineNotice>
            ) : null}

            <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
              <Surface>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Organization details
                  </p>
                  <h2 className="employer-display mt-2 text-[1.8rem] font-semibold text-slate-950">
                    {readOnly
                      ? 'Review your employer record'
                      : 'Keep your employer record current'}
                  </h2>
                  <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
                    {readOnly
                      ? 'Your current organization details remain visible while staff review the account. Editing unlocks again after approval.'
                      : 'Update the core organization details TWA staff use to review and maintain your employer account.'}
                  </p>
                </div>
                <div className="mt-6">
                  <EmployerProfileForm
                    isSubmitting={isSaving}
                    onSubmit={handleSubmit}
                    profile={profile}
                    readOnly={readOnly}
                  />
                </div>
              </Surface>
              <Surface className="flex h-full flex-col px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Account review
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      label: 'Current status',
                      value:
                        reviewStatus === 'approved'
                          ? 'Approved and able to submit listings'
                          : reviewStatus === 'rejected'
                            ? 'Not approved by TWA staff'
                            : 'Pending review by TWA staff',
                    },
                    {
                      label: 'Contact name',
                      value: profile?.contact_name ?? 'Not set',
                    },
                    {
                      label: 'Last reviewed',
                      value: formatDateTime(profile?.reviewed_at),
                    },
                    {
                      label: 'Profile updated',
                      value: formatDateTime(profile?.updated_at),
                    },
                  ].map((item) => (
                    <div
                      className="rounded-[22px] border border-[#eadfce] bg-[#fcfaf6] px-4 py-4"
                      key={item.label}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
