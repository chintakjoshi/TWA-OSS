import { useState } from 'react'

import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import { getAuthErrorMessage } from '@shared/auth/errorMessage'
import { OtpCodeInput } from '@shared/auth/OtpCodeInput'
import { isCompleteOtpCode } from '@shared/auth/otp'
import { HttpError } from '@shared/lib/http'

import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import {
  AdminButton,
  AdminPanel,
  FieldLabel,
  InlineNotice,
  Modal,
  PanelBody,
  PanelHeader,
  StatusBadge,
  ToggleRow,
} from '../components/ui/AdminUi'

function getMfaErrorMessage(error: unknown): string {
  if (error instanceof HttpError && error.code === 'reauth_required') {
    return 'For security, sign out and sign back in before enabling MFA.'
  }

  const message = getAuthErrorMessage(error)
  return message || 'Unable to update multi-factor authentication right now.'
}

function formatOtpExpiry(expiresIn: number | null): string | null {
  if (!expiresIn || expiresIn <= 0) return null
  const minutes = Math.max(1, Math.round(expiresIn / 60))
  return `The code expires in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
}

export function AdminSecurityPage() {
  const auth = useAuth()
  const mfaEnabled = Boolean(auth.authMe?.email_otp_enabled)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false)
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false)
  const [disableOtpOpen, setDisableOtpOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)

  async function refreshAfterUpdate(successMessage: string) {
    await auth.reload()
    setNotice(successMessage)
  }

  async function handleEnable() {
    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      await auth.enableEmailOtp()
      await refreshAfterUpdate('Multi-factor authentication is now enabled.')
      setConfirmEnableOpen(false)
    } catch (nextError) {
      setError(getMfaErrorMessage(nextError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function requestDisableOtp() {
    setIsRequestingOtp(true)
    setError(null)
    setNotice(null)

    try {
      const response = await auth.requestActionOtp({ action: 'disable_otp' })
      setOtpCode('')
      setOtpExpiresIn(response.expires_in)
      setConfirmDisableOpen(false)
      setDisableOtpOpen(true)
    } catch (nextError) {
      setError(getMfaErrorMessage(nextError))
    } finally {
      setIsRequestingOtp(false)
    }
  }

  async function handleDisable() {
    if (!isCompleteOtpCode(otpCode)) {
      setError('Enter the 6-digit OTP code from your email before turning MFA off.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      const verification = await auth.verifyActionOtp({
        action: 'disable_otp',
        code: otpCode,
      })
      await auth.disableEmailOtp(verification.action_token)
      await refreshAfterUpdate('Multi-factor authentication is now disabled.')
      setDisableOtpOpen(false)
      setOtpCode('')
      setOtpExpiresIn(null)
    } catch (nextError) {
      setError(getMfaErrorMessage(nextError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendOtp() {
    setIsResendingOtp(true)
    setError(null)

    try {
      const response = await auth.requestActionOtp({ action: 'disable_otp' })
      setOtpExpiresIn(response.expires_in)
      setNotice('A fresh OTP code has been sent to your email.')
    } catch (nextError) {
      setError(getMfaErrorMessage(nextError))
    } finally {
      setIsResendingOtp(false)
    }
  }

  return (
    <AdminWorkspaceLayout title="Security">
      <div className="space-y-6">
        {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

        <AdminPanel className="max-w-4xl">
          <PanelHeader
            title="Multi-Factor Authentication"
            subtitle="Protect your TWA staff account with an email OTP challenge during sign-in."
            action={
              <StatusBadge tone={mfaEnabled ? 'success' : 'neutral'}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </StatusBadge>
            }
          />
          <PanelBody className="space-y-6">
            <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#132130] p-3 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-950">
                    Staff account sign-in protection
                  </p>
                  <p className="text-sm leading-7 text-slate-500">
                    Turning MFA on will require an OTP code during login.
                    Turning it off requires a fresh OTP verification first.
                  </p>
                </div>
              </div>
            </div>

            <ToggleRow
              checked={mfaEnabled}
              description="Require a one-time password from the staff email inbox whenever this account signs in."
              disabled={isSubmitting || isRequestingOtp || isResendingOtp}
              title="Multi-Factor Authentication"
              onChange={(nextChecked) => {
                if (nextChecked) {
                  setError(null)
                  setNotice(null)
                  setConfirmEnableOpen(true)
                  return
                }

                setError(null)
                setNotice(null)
                setConfirmDisableOpen(true)
              }}
            />
          </PanelBody>
        </AdminPanel>
      </div>

      <Modal
        open={confirmEnableOpen}
        title="Enable multi-factor authentication?"
        onClose={() => {
          if (isSubmitting) return
          setConfirmEnableOpen(false)
        }}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-slate-600">
            Are you sure you want to enable multi-factor authentication?
            Enabling this will require an OTP code during login.
          </p>
          <div className="flex justify-end gap-3">
            <AdminButton
              disabled={isSubmitting}
              variant="secondary"
              onClick={() => setConfirmEnableOpen(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={isSubmitting}
              onClick={() => {
                void handleEnable()
              }}
            >
              {isSubmitting ? 'Enabling...' : 'Yes, enable MFA'}
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDisableOpen}
        title="Disable multi-factor authentication?"
        onClose={() => {
          if (isRequestingOtp) return
          setConfirmDisableOpen(false)
        }}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-slate-600">
            Are you sure you want to disable multi-factor authentication?
            Disabling it will stop OTP verification during login.
          </p>
          <div className="flex justify-end gap-3">
            <AdminButton
              disabled={isRequestingOtp}
              variant="secondary"
              onClick={() => setConfirmDisableOpen(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={isRequestingOtp}
              variant="danger"
              onClick={() => {
                void requestDisableOtp()
              }}
            >
              {isRequestingOtp ? 'Sending OTP...' : 'Yes, send OTP'}
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={disableOtpOpen}
        title="Turn off multi-factor authentication"
        onClose={() => {
          if (isSubmitting || isResendingOtp) return
          setDisableOtpOpen(false)
        }}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm leading-7 text-slate-600">
              Enter the OTP code sent to your email to turn MFA off.
            </p>
            {formatOtpExpiry(otpExpiresIn) ? (
              <p className="text-sm text-slate-500">
                {formatOtpExpiry(otpExpiresIn)}
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel>OTP code</FieldLabel>
            <div className="mt-2">
              <OtpCodeInput
                ariaLabel="OTP code"
                value={otpCode}
                onChange={setOtpCode}
              />
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <AdminButton
              disabled={isSubmitting || isResendingOtp}
              variant="secondary"
              onClick={() => {
                void handleResendOtp()
              }}
            >
              {isResendingOtp ? 'Resending...' : 'Resend OTP'}
            </AdminButton>
            <div className="flex gap-3">
              <AdminButton
                disabled={isSubmitting || isResendingOtp}
                variant="secondary"
                onClick={() => setDisableOtpOpen(false)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                disabled={isSubmitting || isResendingOtp}
                variant="danger"
                onClick={() => {
                  void handleDisable()
                }}
              >
                {isSubmitting ? 'Turning off...' : 'Turn off MFA'}
              </AdminButton>
            </div>
          </div>
        </div>
      </Modal>
    </AdminWorkspaceLayout>
  )
}
