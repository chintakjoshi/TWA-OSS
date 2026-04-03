import { useEffect, useState } from 'react'

import type {
  EmployerProfile,
  EmployerProfileFormValues,
} from '../types/employer'
import { announceComingSoon } from '../lib/comingSoon'
import { FieldLabel, PortalButton, inputClassName } from './ui/EmployerUi'

function toValues(profile: EmployerProfile | null): EmployerProfileFormValues {
  return {
    org_name: profile?.org_name ?? '',
    contact_name: profile?.contact_name ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    zip: profile?.zip ?? '',
  }
}

type EmployerProfileFormMode = 'full' | 'setup'

export function EmployerProfileForm({
  profile,
  isSubmitting,
  onSubmit,
  mode = 'full',
  readOnly = false,
  submitLabel = 'Save employer profile',
}: {
  profile: EmployerProfile | null
  isSubmitting: boolean
  onSubmit: (values: EmployerProfileFormValues) => Promise<void>
  mode?: EmployerProfileFormMode
  readOnly?: boolean
  submitLabel?: string
}) {
  const [values, setValues] = useState<EmployerProfileFormValues>(() =>
    toValues(profile)
  )
  const controlsDisabled = readOnly || isSubmitting
  const fieldClassName = [
    inputClassName,
    readOnly ? 'cursor-not-allowed bg-[#f8f4ec] text-slate-500' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const placeholderClassName = [
    inputClassName,
    'cursor-pointer text-left text-slate-400 disabled:cursor-not-allowed disabled:bg-[#f8f4ec] disabled:text-slate-400',
  ].join(' ')

  useEffect(() => {
    setValues(toValues(profile))
  }, [profile])

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        if (readOnly) return
        void onSubmit(values)
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Organization Name</FieldLabel>
          <input
            aria-label="Organization name"
            className={fieldClassName}
            disabled={controlsDisabled}
            required
            value={values.org_name}
            onChange={(event) =>
              setValues({ ...values, org_name: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Contact Name</FieldLabel>
          <input
            aria-label="Contact name"
            className={fieldClassName}
            disabled={controlsDisabled}
            value={values.contact_name}
            onChange={(event) =>
              setValues({ ...values, contact_name: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Phone</FieldLabel>
          <input
            aria-label="Phone"
            className={fieldClassName}
            disabled={controlsDisabled}
            value={values.phone}
            onChange={(event) =>
              setValues({ ...values, phone: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Address</FieldLabel>
          <input
            aria-label="Address"
            className={fieldClassName}
            disabled={controlsDisabled}
            value={values.address}
            onChange={(event) =>
              setValues({ ...values, address: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>City</FieldLabel>
          <input
            aria-label="City"
            className={fieldClassName}
            disabled={controlsDisabled}
            value={values.city}
            onChange={(event) =>
              setValues({ ...values, city: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>ZIP Code</FieldLabel>
          <input
            aria-label="ZIP code"
            className={fieldClassName}
            disabled={controlsDisabled}
            value={values.zip}
            onChange={(event) =>
              setValues({ ...values, zip: event.target.value })
            }
          />
        </div>
        {mode === 'full' ? (
          <>
            <div>
              <FieldLabel>Website</FieldLabel>
              <button
                aria-label="Website"
                className={placeholderClassName}
                disabled={readOnly}
                type="button"
                onClick={() => announceComingSoon('Employer website field')}
              >
                Add your public company website
              </button>
            </div>
            <div>
              <FieldLabel>Industry</FieldLabel>
              <button
                aria-label="Industry"
                className={placeholderClassName}
                disabled={readOnly}
                type="button"
                onClick={() => announceComingSoon('Industry selector')}
              >
                Choose your industry
              </button>
            </div>
            <div>
              <FieldLabel>Organization Size</FieldLabel>
              <button
                aria-label="Organization size"
                className={placeholderClassName}
                disabled={readOnly}
                type="button"
                onClick={() => announceComingSoon('Organization size selector')}
              >
                Track company headcount
              </button>
            </div>
          </>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap justify-end gap-3">
          <PortalButton disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving profile...' : submitLabel}
          </PortalButton>
        </div>
      ) : null}
    </form>
  )
}
