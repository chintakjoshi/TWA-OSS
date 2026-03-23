import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'

import {
  getNotificationConfig,
  updateNotificationConfig,
} from '../api/adminApi'
import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import {
  AdminButton,
  AdminPanel,
  InlineNotice,
  PanelBody,
  PanelHeader,
  StatusBadge,
  ToggleRow,
} from '../components/ui/AdminUi'
import { ErrorState, LoadingState } from '../components/PageState'
import { announceComingSoon } from '../lib/comingSoon'
import { formatDateTime } from '../lib/formatting'
import type { NotificationConfig } from '../types/admin'

export function AdminNotificationsPage() {
  const auth = useAuth()
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewToggles, setPreviewToggles] = useState({
    jobseeker_profile_updates: false,
    listing_review_complete: false,
    account_status_updates: true,
  })

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
  }, [auth.requestTwa])

  async function handleSave() {
    if (!config) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await updateNotificationConfig(auth.requestTwa, {
        notify_staff_on_apply: config.notify_staff_on_apply,
        notify_employer_on_apply: config.notify_employer_on_apply,
        share_applicants_with_employer: config.share_applicants_with_employer,
      })
      setConfig(response.config)
      toast.success('Notification settings updated.')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save notification settings.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspaceLayout title="Notification Config">
      <div className="space-y-6">
        {isLoading ? (
          <LoadingState title="Loading notification settings..." />
        ) : null}
        {!isLoading && error && !config ? (
          <ErrorState
            title="Notification settings unavailable"
            message={error}
          />
        ) : null}

        {!isLoading && config ? (
          <>
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            <AdminPanel className="max-w-5xl">
              <PanelHeader
                subtitle="Real toggles are connected to the current backend config. Preview toggles are frontend-only for now."
                title="Notification Settings"
              />
              <PanelBody className="space-y-8">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]">
                      Staff Notifications
                    </p>
                    <StatusBadge tone="success">Live</StatusBadge>
                  </div>
                  <ToggleRow
                    checked={config.notify_staff_on_apply}
                    description="Notify staff when a jobseeker submits a new application."
                    title="New Application Submitted"
                    onChange={(checked) =>
                      setConfig({ ...config, notify_staff_on_apply: checked })
                    }
                  />
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]">
                      Employer Notifications
                    </p>
                    <StatusBadge tone="success">Live</StatusBadge>
                  </div>
                  <ToggleRow
                    checked={config.notify_employer_on_apply}
                    description="Forward application alerts to the employer contact on file."
                    title="Application Received"
                    onChange={(checked) =>
                      setConfig({
                        ...config,
                        notify_employer_on_apply: checked,
                      })
                    }
                  />
                  <ToggleRow
                    checked={config.share_applicants_with_employer}
                    description="Allow employers to view applicant records when sharing is enabled."
                    title="Share Applicant Data With Employers"
                    onChange={(checked) =>
                      setConfig({
                        ...config,
                        share_applicants_with_employer: checked,
                      })
                    }
                  />
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]">
                      Future Controls
                    </p>
                    <StatusBadge tone="warning">Preview only</StatusBadge>
                  </div>
                  <ToggleRow
                    checked={previewToggles.jobseeker_profile_updates}
                    description="Notify the assigned case manager when a jobseeker profile changes."
                    preview={
                      <StatusBadge tone="warning">Coming soon</StatusBadge>
                    }
                    title="Jobseeker Profile Updates"
                    onChange={(checked) => {
                      setPreviewToggles((current) => ({
                        ...current,
                        jobseeker_profile_updates: checked,
                      }))
                      announceComingSoon(
                        'Jobseeker profile update notifications'
                      )
                    }}
                  />
                  <ToggleRow
                    checked={previewToggles.listing_review_complete}
                    description="Notify employers when a listing review decision is completed."
                    preview={
                      <StatusBadge tone="warning">Coming soon</StatusBadge>
                    }
                    title="Listing Approved Or Rejected"
                    onChange={(checked) => {
                      setPreviewToggles((current) => ({
                        ...current,
                        listing_review_complete: checked,
                      }))
                      announceComingSoon('Listing review notifications')
                    }}
                  />
                  <ToggleRow
                    checked={previewToggles.account_status_updates}
                    description="Notify employers when their account registration status changes."
                    preview={
                      <StatusBadge tone="warning">Coming soon</StatusBadge>
                    }
                    title="Account Approval Status"
                    onChange={(checked) => {
                      setPreviewToggles((current) => ({
                        ...current,
                        account_status_updates: checked,
                      }))
                      announceComingSoon(
                        'Employer account status notifications'
                      )
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-5 py-4">
                  <p className="text-sm text-slate-500">
                    Last updated {formatDateTime(config.updated_at)}
                  </p>
                  <AdminButton
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                  >
                    {isSaving ? 'Saving...' : 'Save settings'}
                  </AdminButton>
                </div>
              </PanelBody>
            </AdminPanel>
          </>
        ) : null}
      </div>
    </AdminWorkspaceLayout>
  )
}
