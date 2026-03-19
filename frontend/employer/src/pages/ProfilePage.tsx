import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Card, CardBody } from '@shared/ui/primitives'

import {
  getMyEmployerProfile,
  updateMyEmployerProfile,
} from '../api/employerApi'
import { EmployerHeader } from '../components/EmployerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import { EmployerProfileForm } from '../components/EmployerProfileForm'
import { formatDateTime } from '../lib/formatting'
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
  const reviewTone =
    reviewStatus === 'approved'
      ? 'success'
      : reviewStatus === 'rejected'
        ? 'danger'
        : 'warning'

  return (
    <div className="page-frame stack-md employer-shell-page">
      <EmployerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="stack-sm">
              <p className="portal-eyebrow">Employer Profile</p>
              <h2 className="card-title">
                Keep the organization record ready for staff review.
              </h2>
              <p className="card-copy">
                This profile is the source of truth for employer approval and
                future reassessment.
              </p>
            </div>
            <Badge tone={reviewTone}>{reviewStatus}</Badge>
          </div>

          {success ? (
            <Alert tone="success">
              <p>{success}</p>
            </Alert>
          ) : null}
          {profile?.review_note ? (
            <Alert tone={reviewStatus === 'rejected' ? 'danger' : 'info'}>
              <p>{profile.review_note}</p>
            </Alert>
          ) : null}
          {profile?.reviewed_at ? (
            <p className="card-copy">
              Last reviewed: {formatDateTime(profile.reviewed_at)}
            </p>
          ) : null}
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}

          {isLoading ? (
            <LoadingState title="Loading employer profile..." />
          ) : null}
          {!isLoading && error && !profile ? (
            <ErrorState title="Profile unavailable" message={error} />
          ) : null}
          {!isLoading && (!error || profile) ? (
            <EmployerProfileForm
              isSubmitting={isSaving}
              onSubmit={handleSubmit}
              profile={profile}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
