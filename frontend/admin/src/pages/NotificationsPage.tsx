import { useEffect, useState } from 'react'

import { useAuth } from '@shared/auth/AuthProvider'
import { Alert, Button, Card, CardBody } from '@shared/ui/primitives'

import {
  getNotificationConfig,
  updateNotificationConfig,
} from '../api/adminApi'
import { AdminHeader } from '../components/AdminHeader'
import { ErrorState, LoadingState } from '../components/PageState'
import { formatDateTime } from '../lib/formatting'
import type { NotificationConfig } from '../types/admin'

export function AdminNotificationsPage() {
  const auth = useAuth()
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getNotificationConfig(auth.requestTwa)
      .then((response) => {
        if (!active) return
        setConfig(response)
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

  async function handleSave() {
    if (!config) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await updateNotificationConfig(auth.requestTwa, {
        notify_staff_on_apply: config.notify_staff_on_apply,
        notify_employer_on_apply: config.notify_employer_on_apply,
        share_applicants_with_employer: config.share_applicants_with_employer,
      })
      setConfig(response.config)
      setSuccess('Notification settings updated.')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update notification settings.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-frame stack-md admin-shell-page">
      <AdminHeader />
      {isLoading ? (
        <LoadingState title="Loading notification configuration..." />
      ) : null}
      {!isLoading && error && !config ? (
        <ErrorState title="Notification settings unavailable" message={error} />
      ) : null}
      {!isLoading && config ? (
        <Card strong>
          <CardBody className="stack-md">
            <div className="stack-sm">
              <p className="portal-eyebrow">Notifications</p>
              <h2 className="card-title">
                Control email and in-app notification behavior.
              </h2>
              <p className="card-copy">
                These toggles shape both operational alerts and what employers
                can see.
              </p>
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
            <label className="charge-option">
              <input
                checked={config.notify_staff_on_apply}
                type="checkbox"
                onChange={(event) =>
                  setConfig({
                    ...config,
                    notify_staff_on_apply: event.target.checked,
                  })
                }
              />
              <span>Notify staff when a jobseeker applies</span>
            </label>
            <label className="charge-option">
              <input
                checked={config.notify_employer_on_apply}
                type="checkbox"
                onChange={(event) =>
                  setConfig({
                    ...config,
                    notify_employer_on_apply: event.target.checked,
                  })
                }
              />
              <span>Notify employers when new applications arrive</span>
            </label>
            <label className="charge-option">
              <input
                checked={config.share_applicants_with_employer}
                type="checkbox"
                onChange={(event) =>
                  setConfig({
                    ...config,
                    share_applicants_with_employer: event.target.checked,
                  })
                }
              />
              <span>
                Allow employers to view applicants, including charge-field data
              </span>
            </label>
            <p className="card-copy">
              Last updated: {formatDateTime(config.updated_at)}
            </p>
            <div className="inline-actions">
              <Button disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'Saving...' : 'Save notification settings'}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
