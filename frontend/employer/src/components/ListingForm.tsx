import { useEffect, useState } from 'react'

import { Button, Field } from '@shared/ui/primitives'

import type { ChargeFlags, JobListing, ListingFormValues } from '../types/employer'

const defaultCharges: ChargeFlags = {
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
  { key: 'children', label: 'Children-related offense' },
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
]

function toValues(listing?: JobListing | null): ListingFormValues {
  return {
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    location_address: listing?.location_address ?? '',
    city: listing?.city ?? '',
    zip: listing?.zip ?? '',
    transit_required: listing?.transit_required ?? 'any',
    disqualifying_charges: listing?.disqualifying_charges ?? defaultCharges,
  }
}

export function ListingForm({
  listing,
  isSubmitting,
  onSubmit,
}: {
  listing?: JobListing | null
  isSubmitting: boolean
  onSubmit: (values: ListingFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<ListingFormValues>(() => toValues(listing))

  useEffect(() => {
    setValues(toValues(listing))
  }, [listing])

  return (
    <form className="stack-md" onSubmit={(event) => {
      event.preventDefault()
      void onSubmit(values)
    }}>
      <div className="employer-form-grid">
        <Field label="Job title"><input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></Field>
        <Field label="Transit requirement">
          <select value={values.transit_required} onChange={(event) => setValues({ ...values, transit_required: event.target.value as ListingFormValues['transit_required'] })}>
            <option value="any">Any transit option</option>
            <option value="own_car">Own car required</option>
          </select>
        </Field>
        <Field label="Address"><input value={values.location_address} onChange={(event) => setValues({ ...values, location_address: event.target.value })} /></Field>
        <Field label="City"><input value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></Field>
        <Field label="ZIP code"><input value={values.zip} onChange={(event) => setValues({ ...values, zip: event.target.value })} /></Field>
      </div>
      <Field label="Description"><textarea value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></Field>
      <div className="stack-sm">
        <p className="eyebrow">Disqualifying charge categories</p>
        <div className="charges-grid">
          {chargeOptions.map((option) => (
            <label className="charge-option" key={option.key}>
              <input
                checked={values.disqualifying_charges[option.key]}
                type="checkbox"
                onChange={(event) => setValues({
                  ...values,
                  disqualifying_charges: {
                    ...values.disqualifying_charges,
                    [option.key]: event.target.checked,
                  },
                })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <Button disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving listing...' : 'Submit listing'}</Button>
    </form>
  )
}
