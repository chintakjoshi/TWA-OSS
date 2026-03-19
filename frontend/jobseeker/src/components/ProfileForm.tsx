import { useEffect, useState } from 'react'

import { Button, Field } from '@shared/ui/primitives'

import type { ChargeFlags, JobseekerProfile, JobseekerProfileFormValues } from '../types/jobseeker'

const emptyCharges: ChargeFlags = {
  sex_offense: false,
  violent: false,
  armed: false,
  children: false,
  drug: false,
  theft: false,
}

const chargeOptions: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed offense' },
  { key: 'children', label: 'Offense involving children' },
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
]

function toFormValues(profile: JobseekerProfile | null): JobseekerProfileFormValues {
  return {
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    zip: profile?.zip ?? '',
    transit_type: profile?.transit_type ?? '',
    charges: profile?.charges ?? emptyCharges,
  }
}

export function JobseekerProfileForm({
  profile,
  isSubmitting,
  onSubmit,
}: {
  profile: JobseekerProfile | null
  isSubmitting: boolean
  onSubmit: (values: JobseekerProfileFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<JobseekerProfileFormValues>(() => toFormValues(profile))

  useEffect(() => {
    setValues(toFormValues(profile))
  }, [profile])

  return (
    <form className="stack-md" onSubmit={(event) => {
      event.preventDefault()
      void onSubmit(values)
    }}>
      <div className="profile-grid">
        <Field label="Full name"><input value={values.full_name} onChange={(event) => setValues({ ...values, full_name: event.target.value })} /></Field>
        <Field label="Phone"><input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></Field>
        <Field label="Address"><input value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} /></Field>
        <Field label="City"><input value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></Field>
        <Field label="ZIP code"><input value={values.zip} onChange={(event) => setValues({ ...values, zip: event.target.value })} /></Field>
        <Field label="Transit type">
          <select value={values.transit_type} onChange={(event) => setValues({ ...values, transit_type: event.target.value as JobseekerProfileFormValues['transit_type'] })}>
            <option value="">Select one</option>
            <option value="own_car">Own car</option>
            <option value="public_transit">Public transit</option>
            <option value="both">Both</option>
          </select>
        </Field>
      </div>

      <div className="stack-sm">
        <p className="eyebrow">Background categories</p>
        <div className="charges-grid">
          {chargeOptions.map((option) => (
            <label className="charge-option" key={option.key}>
              <input
                checked={values.charges[option.key]}
                type="checkbox"
                onChange={(event) => {
                  setValues({
                    ...values,
                    charges: {
                      ...values.charges,
                      [option.key]: event.target.checked,
                    },
                  })
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving profile...' : 'Save profile'}</Button>
    </form>
  )
}
