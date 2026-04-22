import { useState } from 'react'

import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'
import {
  formatMfaOtpExpiry,
  getMfaErrorMessage,
  getMfaStatusLabel,
  MFA_CARD_DESCRIPTION,
  MFA_DISABLE_CONFIRM_BODY,
  MFA_DISABLE_CONFIRM_TITLE,
  MFA_DISABLE_OTP_MODAL_TITLE,
  MFA_DISABLE_OTP_PROMPT,
  MFA_DISABLE_OTP_REQUIRED,
  MFA_DISABLE_SUCCESS,
  MFA_ENABLE_CONFIRM_BODY,
  MFA_ENABLE_CONFIRM_TITLE,
  MFA_ENABLE_SUCCESS,
  MFA_OTP_CODE_ARIA_LABEL,
  MFA_RESEND_SUCCESS,
  MFA_TITLE,
  MFA_TOGGLE_DESCRIPTION,
} from '@shared/auth/mfa'
import { OtpCodeInput } from '@shared/auth/OtpCodeInput'
import { isCompleteOtpCode } from '@shared/auth/otp'

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

  function finishMfaUpdate(successMessage: string) {
    setNotice(successMessage)
  }

  async function handleEnable() {
    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      await auth.enableEmailOtp()
      finishMfaUpdate(MFA_ENABLE_SUCCESS)
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
      setError(MFA_DISABLE_OTP_REQUIRED)
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
      finishMfaUpdate(MFA_DISABLE_SUCCESS)
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
      setNotice(MFA_RESEND_SUCCESS)
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
            title={MFA_TITLE}
            subtitle="Protect your TWA staff account with an email OTP challenge during sign-in."
            action={
              <StatusBadge tone={mfaEnabled ? 'success' : 'neutral'}>
                {getMfaStatusLabel(mfaEnabled)}
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
                    {MFA_CARD_DESCRIPTION}
                  </p>
                </div>
              </div>
            </div>

            <ToggleRow
              checked={mfaEnabled}
              description={MFA_TOGGLE_DESCRIPTION}
              disabled={isSubmitting || isRequestingOtp || isResendingOtp}
              title={MFA_TITLE}
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
        title={MFA_ENABLE_CONFIRM_TITLE}
        onClose={() => {
          if (isSubmitting) return
          setConfirmEnableOpen(false)
        }}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-slate-600">
            {MFA_ENABLE_CONFIRM_BODY}
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
        title={MFA_DISABLE_CONFIRM_TITLE}
        onClose={() => {
          if (isRequestingOtp) return
          setConfirmDisableOpen(false)
        }}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-slate-600">
            {MFA_DISABLE_CONFIRM_BODY}
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
        title={MFA_DISABLE_OTP_MODAL_TITLE}
        onClose={() => {
          if (isSubmitting || isResendingOtp) return
          setDisableOtpOpen(false)
        }}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm leading-7 text-slate-600">
              {MFA_DISABLE_OTP_PROMPT}
            </p>
            {formatMfaOtpExpiry(otpExpiresIn) ? (
              <p className="text-sm text-slate-500">
                {formatMfaOtpExpiry(otpExpiresIn)}
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel>OTP code</FieldLabel>
            <div className="mt-2">
              <OtpCodeInput
                ariaLabel={MFA_OTP_CODE_ARIA_LABEL}
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
