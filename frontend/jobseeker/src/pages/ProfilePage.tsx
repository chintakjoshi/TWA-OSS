import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Badge, Card, CardBody } from '@shared/ui/primitives'

import {
  getMyJobseekerProfile,
  updateMyJobseekerProfile,
} from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import { JobseekerProfileForm } from '../components/ProfileForm'
import type { JobseekerProfile } from '../types/jobseeker'

export function JobseekerProfilePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<JobseekerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getMyJobseekerProfile(auth.requestTwa)
      .then((response) => {
        if (!active) return
        setProfile(response.profile)
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
    values: Parameters<typeof updateMyJobseekerProfile>[1]
  ) {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateMyJobseekerProfile(auth.requestTwa, values)
      const refreshed = await getMyJobseekerProfile(auth.requestTwa)
      setProfile(refreshed.profile)
      await auth.reload()
      setSuccess(
        refreshed.profile.profile_complete
          ? 'Profile saved. You can browse jobs now.'
          : 'Profile saved. Finish the remaining required fields to unlock jobs.'
      )
      if (refreshed.profile.profile_complete) {
        navigate('/jobs')
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save your profile right now.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-frame stack-md shell-page">
      <JobseekerHeader />
      <Card strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="stack-sm">
              <p className="eyebrow">Profile Setup</p>
              <h2 className="card-title">
                Complete the profile TWA uses for matching.
              </h2>
              <p className="card-copy">
                You need a completed profile before the UI unlocks the jobs
                board and application flow.
              </p>
            </div>
            <Badge tone={auth.authMe?.profile_complete ? 'success' : 'warning'}>
              {auth.authMe?.profile_complete ? 'Complete' : 'Still required'}
            </Badge>
          </div>

          {success ? (
            <Alert tone="success">
              <p>{success}</p>
            </Alert>
          ) : null}
          {error ? (
            <Alert tone="danger">
              <p>{error}</p>
            </Alert>
          ) : null}

          {isLoading ? (
            <LoadingState title="Loading your jobseeker profile..." />
          ) : null}
          {!isLoading && error ? (
            <ErrorState title="Profile unavailable" message={error} />
          ) : null}
          {!isLoading && !error ? (
            <JobseekerProfileForm
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
