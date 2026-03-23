import { useEffect, useState } from 'react'

import type {
  EmployerProfile,
  EmployerProfileFormValues,
} from '../types/employer'
import { announceComingSoon } from '../lib/comingSoon'
import {
  FieldLabel,
  InlineNotice,
  PortalButton,
  inputClassName,
} from './ui/EmployerUi'

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

export function EmployerProfileForm({
  profile,
  isSubmitting,
  onSubmit,
  submitLabel = 'Save employer profile',
}: {
  profile: EmployerProfile | null
  isSubmitting: boolean
  onSubmit: (values: EmployerProfileFormValues) => Promise<void>
  submitLabel?: string
}) {
  const [values, setValues] = useState<EmployerProfileFormValues>(() =>
    toValues(profile)
  )

  useEffect(() => {
    setValues(toValues(profile))
  }, [profile])

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Organization Name</FieldLabel>
          <input
            aria-label="Organization name"
            className={inputClassName}
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
            className={inputClassName}
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
            className={inputClassName}
            value={values.phone}
            onChange={(event) =>
              setValues({ ...values, phone: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Website</FieldLabel>
          <button
            aria-label="Website"
            className={`${inputClassName} cursor-pointer text-left text-slate-400`}
            type="button"
            onClick={() => announceComingSoon('Employer website field')}
          >
            Add your public company website
          </button>
        </div>
        <div>
          <FieldLabel>Address</FieldLabel>
          <input
            aria-label="Address"
            className={inputClassName}
            value={values.address}
            onChange={(event) =>
              setValues({ ...values, address: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Industry</FieldLabel>
          <button
            aria-label="Industry"
            className={`${inputClassName} cursor-pointer text-left text-slate-400`}
            type="button"
            onClick={() => announceComingSoon('Industry selector')}
          >
            Choose your industry
          </button>
        </div>
        <div>
          <FieldLabel>City</FieldLabel>
          <input
            aria-label="City"
            className={inputClassName}
            value={values.city}
            onChange={(event) =>
              setValues({ ...values, city: event.target.value })
            }
          />
        </div>
        <div>
          <FieldLabel>Organization Size</FieldLabel>
          <button
            aria-label="Organization size"
            className={`${inputClassName} cursor-pointer text-left text-slate-400`}
            type="button"
            onClick={() => announceComingSoon('Organization size selector')}
          >
            Track company headcount
          </button>
        </div>
        <div>
          <FieldLabel>ZIP Code</FieldLabel>
          <input
            aria-label="ZIP code"
            className={inputClassName}
            value={values.zip}
            onChange={(event) =>
              setValues({ ...values, zip: event.target.value })
            }
          />
        </div>
      </div>

      <div>
        <FieldLabel>Why do you want to hire fair-chance candidates?</FieldLabel>
        <button
          aria-label="Why do you want to hire fair-chance candidates?"
          className={`${inputClassName} min-h-28 cursor-pointer text-left leading-7 text-slate-400`}
          type="button"
          onClick={() => announceComingSoon('Employer mission statement')}
        >
          Share the commitment, hiring philosophy, and support systems you want
          TWA staff to understand.
        </button>
      </div>

      <InlineNotice tone="info">
        The profile fields above save into the current employer API. Additional
        organization metadata is shown here as a forward-looking UI placeholder.
      </InlineNotice>

      <div className="flex flex-wrap justify-end gap-3">
        <PortalButton disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving profile...' : submitLabel}
        </PortalButton>
      </div>
    </form>
  )
}
