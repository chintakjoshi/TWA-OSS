import { useEffect, useState } from 'react'

import type {
  EmployerProfile,
  EmployerProfileFormValues,
} from '../types/employer'
import { Button, Field } from '@shared/ui/primitives'

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
}: {
  profile: EmployerProfile | null
  isSubmitting: boolean
  onSubmit: (values: EmployerProfileFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<EmployerProfileFormValues>(() =>
    toValues(profile)
  )

  useEffect(() => {
    setValues(toValues(profile))
  }, [profile])

  return (
    <form
      className="stack-md"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <div className="employer-form-grid">
        <Field label="Organization name">
          <input
            required
            value={values.org_name}
            onChange={(event) =>
              setValues({ ...values, org_name: event.target.value })
            }
          />
        </Field>
        <Field label="Contact name">
          <input
            value={values.contact_name}
            onChange={(event) =>
              setValues({ ...values, contact_name: event.target.value })
            }
          />
        </Field>
        <Field label="Phone">
          <input
            value={values.phone}
            onChange={(event) =>
              setValues({ ...values, phone: event.target.value })
            }
          />
        </Field>
        <Field label="Address">
          <input
            value={values.address}
            onChange={(event) =>
              setValues({ ...values, address: event.target.value })
            }
          />
        </Field>
        <Field label="City">
          <input
            value={values.city}
            onChange={(event) =>
              setValues({ ...values, city: event.target.value })
            }
          />
        </Field>
        <Field label="ZIP code">
          <input
            value={values.zip}
            onChange={(event) =>
              setValues({ ...values, zip: event.target.value })
            }
          />
        </Field>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Saving profile...' : 'Save employer profile'}
      </Button>
    </form>
  )
}
