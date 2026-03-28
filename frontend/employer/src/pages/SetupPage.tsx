import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '@shared/auth/AuthProvider'

import { EmployerProfileForm } from '../components/EmployerProfileForm'
import { InlineNotice, Surface } from '../components/ui/EmployerUi'

export function EmployerSetupPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (auth.state === 'anonymous') return <Navigate replace to="/auth" />
  if (auth.authMe?.app_user?.app_role === 'employer')
    return <Navigate replace to="/dashboard" />

  return (
    <main className="min-h-screen bg-[#f7f1e5] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#132130] text-white">
            T
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">
              TWA Employer Portal
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8ea3c4]">
              Transformative Workforce Academy
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[680px] text-center">
          <h1 className="employer-display text-[3.1rem] leading-[0.98] font-semibold text-slate-950">
            Set up your employer profile
          </h1>
        </div>

        <Surface className="mx-auto mt-10 max-w-[760px]">
          <div className="mb-8 flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f5f8ff] text-[#2458b8]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="employer-display text-[1.8rem] font-semibold text-slate-950">
                Organization details
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Share the core organization and contact details TWA staff use to
                review your employer account. Once approved, you will unlock the
                rest of the employer workflow and future profile edits.
              </p>
            </div>
          </div>

          {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

          <div className="mt-6">
            <EmployerProfileForm
              isSubmitting={busy}
              mode="setup"
              profile={null}
              submitLabel="Submit for review"
              onSubmit={async (values) => {
                setBusy(true)
                setError(null)
                try {
                  await auth.bootstrapRole({
                    role: 'employer',
                    employer_profile: {
                      org_name: values.org_name,
                      contact_name: values.contact_name || null,
                      phone: values.phone || null,
                    },
                  })
                  navigate('/dashboard', { replace: true })
                } catch (nextError) {
                  setError(
                    nextError instanceof Error
                      ? nextError.message
                      : 'Unable to create the employer profile right now.'
                  )
                } finally {
                  setBusy(false)
                }
              }}
            />
          </div>
        </Surface>
      </div>
    </main>
  )
}
