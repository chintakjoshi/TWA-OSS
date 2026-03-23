import { useEffect, useState } from 'react'

import type {
  ChargeFlags,
  JobListing,
  ListingFormValues,
} from '../types/employer'
import { announceComingSoon } from '../lib/comingSoon'
import {
  FieldLabel,
  InlineNotice,
  PortalButton,
  inputClassName,
} from './ui/EmployerUi'

const defaultCharges: ChargeFlags = {
  sex_offense: false,
  violent: false,
  armed: false,
  children: false,
  drug: false,
  theft: false,
}

const chargeOptions: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed offense' },
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'children', label: 'Children-related offense' },
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

function PlaceholderField({
  label,
  placeholder,
  feature,
}: {
  label: string
  placeholder: string
  feature: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <button
        aria-label={label}
        className={`${inputClassName} cursor-pointer text-left text-slate-400`}
        type="button"
        onClick={() => announceComingSoon(feature)}
      >
        {placeholder}
      </button>
    </div>
  )
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
  const [values, setValues] = useState<ListingFormValues>(() =>
    toValues(listing)
  )

  useEffect(() => {
    setValues(toValues(listing))
  }, [listing])

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(values)
      }}
    >
      <InlineNotice tone="info">
        TWA staff review every listing before it goes live. Keep requirements
        specific so staff can match candidates accurately.
      </InlineNotice>

      <section className="space-y-5 rounded-[28px] border border-[#e7ddce] bg-[#fffdf9] p-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
            Basic details
          </p>
          <h3 className="employer-display text-[1.5rem] font-semibold text-slate-950">
            Role information
          </h3>
        </div>

        <div>
          <FieldLabel>Job Title</FieldLabel>
          <input
            aria-label="Job title"
            className={inputClassName}
            placeholder="Warehouse Associate, Forklift Operator, Line Cook"
            required
            value={values.title}
            onChange={(event) =>
              setValues({ ...values, title: event.target.value })
            }
          />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            aria-label="Description"
            className={`${inputClassName} min-h-28 py-3`}
            placeholder="Describe responsibilities, the team environment, and what success looks like."
            value={values.description}
            onChange={(event) =>
              setValues({ ...values, description: event.target.value })
            }
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              aria-label="Address"
              className={inputClassName}
              placeholder="1234 Industrial Blvd"
              value={values.location_address}
              onChange={(event) =>
                setValues({ ...values, location_address: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <input
              aria-label="City"
              className={inputClassName}
              placeholder="St. Louis"
              value={values.city}
              onChange={(event) =>
                setValues({ ...values, city: event.target.value })
              }
            />
          </div>
          <PlaceholderField
            feature="Employment type"
            label="Employment Type"
            placeholder="Track full-time, part-time, and shift details"
          />
          <PlaceholderField
            feature="Pay range"
            label="Pay Range"
            placeholder="Add compensation details for jobseekers"
          />
          <div>
            <FieldLabel>ZIP Code</FieldLabel>
            <input
              aria-label="ZIP code"
              className={inputClassName}
              placeholder="63101"
              value={values.zip}
              onChange={(event) =>
                setValues({ ...values, zip: event.target.value })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-[28px] border border-[#e7ddce] bg-[#fffdf9] p-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
            Transportation requirement
          </p>
          <h3 className="employer-display text-[1.5rem] font-semibold text-slate-950">
            Help TWA match candidates accurately
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label
            className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
              values.transit_required === 'any'
                ? 'border-[#2458b8] bg-[#f5f8ff] shadow-[0_0_0_3px_rgba(36,88,184,0.08)]'
                : 'border-[#ddcfba] bg-white'
            }`}
          >
            <input
              checked={values.transit_required === 'any'}
              className="sr-only"
              name="transit_required"
              type="radio"
              onChange={() => setValues({ ...values, transit_required: 'any' })}
            />
            <p className="font-semibold text-slate-950">Transit accessible</p>
            <p className="mt-1 text-sm text-slate-500">
              Reachable by MetroBus, MetroLink, or other transit options.
            </p>
          </label>
          <label
            className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
              values.transit_required === 'own_car'
                ? 'border-[#2458b8] bg-[#f5f8ff] shadow-[0_0_0_3px_rgba(36,88,184,0.08)]'
                : 'border-[#ddcfba] bg-white'
            }`}
          >
            <input
              checked={values.transit_required === 'own_car'}
              className="sr-only"
              name="transit_required"
              type="radio"
              onChange={() =>
                setValues({ ...values, transit_required: 'own_car' })
              }
            />
            <p className="font-semibold text-slate-950">Own vehicle required</p>
            <p className="mt-1 text-sm text-slate-500">
              Candidates need reliable personal transportation.
            </p>
          </label>
        </div>
      </section>

      <section className="space-y-5 rounded-[28px] border border-[#e7ddce] bg-[#fffdf9] p-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
            Hiring criteria
          </p>
          <h3 className="employer-display text-[1.5rem] font-semibold text-slate-950">
            Disqualifying charges for this role
          </h3>
        </div>

        <InlineNotice tone="info">
          If charge categories below are disqualifying for this role, TWA uses
          that information to filter candidates before matching. Leave boxes
          unchecked if no categories are disqualifying.
        </InlineNotice>

        <div className="grid gap-3 md:grid-cols-2">
          {chargeOptions.map((option) => (
            <label
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#ddcfba] bg-white px-4 py-3"
              key={option.key}
            >
              <input
                aria-label={option.label}
                checked={values.disqualifying_charges[option.key]}
                type="checkbox"
                onChange={(event) =>
                  setValues({
                    ...values,
                    disqualifying_charges: {
                      ...values.disqualifying_charges,
                      [option.key]: event.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm font-medium text-slate-700">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <PortalButton
          disabled={isSubmitting}
          type="button"
          variant="secondary"
          onClick={() => announceComingSoon('Save draft')}
        >
          Save as draft
        </PortalButton>
        <PortalButton disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Submitting...' : 'Submit listing'}
        </PortalButton>
      </div>
    </form>
  )
}
