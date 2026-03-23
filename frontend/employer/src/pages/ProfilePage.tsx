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
  DefinitionList,
  InlineNotice,
  PortalBadge,
  PortalPanel,
  Surface,
} from '../components/ui/EmployerUi'
import { formatDateTime, getStatusTone } from '../lib/formatting'
import type { EmployerProfile } from '../types/employer'

export function EmployerProfilePage() {
  const auth = useAuth()
  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const reviewStatus =
    profile?.review_status ?? auth.authMe?.employer_review_status ?? 'pending'

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
            <PortalPanel>
              <div className="space-y-6 px-6 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <PortalBadge tone={getStatusTone(reviewStatus)}>
                      {reviewStatus === 'approved'
                        ? 'Approved profile'
                        : reviewStatus === 'rejected'
                          ? 'Not approved'
                          : 'Pending review'}
                    </PortalBadge>
                    <h1 className="employer-display mt-4 text-[2.4rem] leading-[1.02] font-semibold text-slate-950">
                      Employer profile
                    </h1>
                    <p className="mt-3 max-w-[760px] text-base leading-8 text-slate-500">
                      Keep the organization record current so TWA staff can
                      review, approve, or reassess the employer account from the
                      same source of truth.
                    </p>
                  </div>
                </div>

                {success ? (
                  <InlineNotice tone="success">{success}</InlineNotice>
                ) : null}
                {error ? (
                  <InlineNotice tone="danger">{error}</InlineNotice>
                ) : null}
                {profile?.review_note ? (
                  <InlineNotice
                    tone={reviewStatus === 'rejected' ? 'danger' : 'info'}
                  >
                    {profile.review_note}
                  </InlineNotice>
                ) : null}
              </div>
            </PortalPanel>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
              <Surface>
                <EmployerProfileForm
                  isSubmitting={isSaving}
                  onSubmit={handleSubmit}
                  profile={profile}
                />
              </Surface>

              <div className="space-y-6">
                <Surface>
                  <h2 className="employer-display text-[1.5rem] font-semibold text-slate-950">
                    Account review
                  </h2>
                  <DefinitionList
                    className="mt-5 md:grid-cols-1"
                    items={[
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
                        label: 'Last reviewed',
                        value: formatDateTime(profile?.reviewed_at),
                      },
                      {
                        label: 'Profile updated',
                        value: formatDateTime(profile?.updated_at),
                      },
                    ]}
                  />
                </Surface>

                <Surface>
                  <h2 className="employer-display text-[1.5rem] font-semibold text-slate-950">
                    Portal placeholders
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    The richer organization metadata in this screen is
                    intentionally frontend-only for now. It mirrors the planned
                    employer experience without inventing unsupported backend
                    behavior.
                  </p>
                </Surface>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
