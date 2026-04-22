import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@shared/auth/AuthProvider'
import {
  normalizeSingleLineText,
  normalizeUsZipInput,
} from '@shared/lib/address'

import {
  getMyJobseekerProfile,
  updateMyJobseekerProfile,
} from '../api/jobseekerApi'
import { JobseekerHeader } from '../components/JobseekerHeader'
import { JobseekerMfaSection } from '../components/JobseekerMfaSection'
import { ErrorState, LoadingState } from '../components/PageState'
import {
  DefinitionList,
  InlineNotice,
  PanelBody,
  PortalBadge,
  PortalButton,
  PortalPanel,
  Surface,
  inputClassName,
} from '../components/ui/JobseekerUi'
import { formatMonthYear, getInitials } from '../lib/formatting'
import type {
  ChargeFlags,
  JobseekerProfile,
  JobseekerProfileFormValues,
} from '../types/jobseeker'

const emptyCharges: ChargeFlags = {
  sex_offense: false,
  violent: false,
  armed: false,
  children: false,
  drug: false,
  theft: false,
}

const chargeOptions: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'drug', label: 'Drug charge or controlled substance offense' },
  { key: 'theft', label: 'Theft or robbery' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed criminal action (ACA)' },
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'children', label: 'Offense involving a child' },
]

type WizardStep = 1 | 2 | 3 | 4
type WizardMode = 'setup' | 'edit'
type PreferredContact = 'Email' | 'Phone' | 'Text'

interface ProfileDraft {
  first_name: string
  last_name: string
  phone: string
  address: string
  city: string
  zip: string
  transit_type: JobseekerProfileFormValues['transit_type']
  charges: ChargeFlags
  preferred_contact: PreferredContact
}

function splitFullName(fullName: string | null | undefined) {
  const value = fullName?.trim() ?? ''
  if (!value) return { first_name: '', last_name: '' }
  const [first_name = '', ...rest] = value.split(/\s+/)
  return {
    first_name,
    last_name: rest.join(' '),
  }
}

function toDraft(
  profile: JobseekerProfile | null,
  preferredContact: PreferredContact = 'Email'
): ProfileDraft {
  const name = splitFullName(profile?.full_name)
  return {
    first_name: name.first_name,
    last_name: name.last_name,
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    zip: profile?.zip ?? '',
    transit_type: profile?.transit_type ?? '',
    charges: profile?.charges ?? emptyCharges,
    preferred_contact: preferredContact,
  }
}

function toPayload(draft: ProfileDraft): JobseekerProfileFormValues {
  return {
    full_name: [
      normalizeSingleLineText(draft.first_name),
      normalizeSingleLineText(draft.last_name),
    ]
      .filter(Boolean)
      .join(' '),
    phone: normalizeSingleLineText(draft.phone),
    address: normalizeSingleLineText(draft.address),
    city: normalizeSingleLineText(draft.city),
    zip: normalizeUsZipInput(draft.zip),
    transit_type: draft.transit_type,
    charges: draft.charges,
  }
}

function inferInitialStep(profile: JobseekerProfile | null): WizardStep {
  if (!profile) return 1
  if (
    !profile.full_name &&
    !profile.phone &&
    !profile.address &&
    !profile.city &&
    !profile.zip &&
    !profile.transit_type
  ) {
    return 1
  }
  if (!profile.full_name || !profile.phone) return 2
  if (
    !profile.address ||
    !profile.city ||
    !profile.zip ||
    !profile.transit_type
  )
    return 3
  return 4
}

function validateStep(step: WizardStep, draft: ProfileDraft) {
  if (step === 2) {
    if (!draft.first_name.trim() || !draft.last_name.trim()) {
      return 'Add both your first and last name before continuing.'
    }
    if (!draft.phone.trim()) {
      return 'Add a phone number before continuing.'
    }
  }
  if (step === 3) {
    if (!draft.address.trim() || !draft.city.trim() || !draft.zip.trim()) {
      return 'Add your address, city, and ZIP code before continuing.'
    }
    if (!draft.transit_type) {
      return 'Choose how you can travel before continuing.'
    }
  }
  return null
}

function statusTone(status: JobseekerProfile['status']) {
  return status === 'hired' ? 'success' : 'active'
}

const setupSteps: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Personal Info' },
  { id: 3, label: 'Location & Transit' },
  { id: 4, label: 'Background' },
]

export function JobseekerProfilePage() {
  const auth = useAuth()
  const appUserId = auth.authMe?.app_user?.id
  const navigate = useNavigate()
  const [profile, setProfile] = useState<JobseekerProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [step, setStep] = useState<WizardStep>(1)
  const [wizardMode, setWizardMode] = useState<WizardMode>('setup')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hydrateProfile = useEffectEvent(
    async (active: { current: boolean }) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getMyJobseekerProfile(auth.requestTwa)
        if (!active.current) return
        setProfile(response.profile)
        setDraft(toDraft(response.profile))
        setStep(inferInitialStep(response.profile))
        setWizardMode(response.profile.profile_complete ? 'edit' : 'setup')
        setIsEditing(!response.profile.profile_complete)
      } catch (nextError) {
        if (!active.current) return
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load your profile right now.'
        )
      } finally {
        if (active.current) setIsLoading(false)
      }
    }
  )

  useEffect(() => {
    if (!appUserId) return

    const active = { current: true }
    void hydrateProfile(active)
    return () => {
      active.current = false
    }
  }, [appUserId])

  const selectedCharges = useMemo(() => {
    if (!draft) return []
    return chargeOptions.filter((option) => draft.charges[option.key])
  }, [draft])

  const selectedChargeSummary = useMemo(() => {
    if (selectedCharges.length === 0) return 'No background categories selected'
    return selectedCharges.map((option) => option.label).join(', ')
  }, [selectedCharges])

  async function saveDraft(
    options: {
      nextStep?: WizardStep
      reloadAuth?: boolean
    } = {}
  ) {
    if (!draft) return null
    const { nextStep, reloadAuth = false } = options
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateMyJobseekerProfile(auth.requestTwa, toPayload(draft))
      const refreshed = await getMyJobseekerProfile(auth.requestTwa)
      setProfile(refreshed.profile)
      setDraft((current) =>
        toDraft(refreshed.profile, current?.preferred_contact ?? 'Email')
      )
      if (reloadAuth) {
        await auth.reload()
      }
      if (nextStep) setStep(nextStep)
      return refreshed.profile
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save your profile right now.'
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleNext() {
    if (!draft) return
    const validation = validateStep(step, draft)
    if (validation) {
      setError(validation)
      return
    }
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2) {
      const refreshed = await saveDraft({ nextStep: 3 })
      if (refreshed) {
        setSuccess('Personal information saved. Continue with your location.')
      }
      return
    }
    if (step === 3) {
      const refreshed = await saveDraft({ nextStep: 4 })
      if (refreshed) {
        setSuccess(
          'Location and transit details saved. Finish with background info.'
        )
      }
      return
    }

    const refreshed = await saveDraft({ reloadAuth: true })
    if (!refreshed) return

    toast.success('Profile saved.', {
      description: refreshed.profile_complete
        ? 'Your jobseeker profile is ready.'
        : 'Your profile was updated.',
    })

    if (wizardMode === 'edit') {
      setIsEditing(false)
      setSuccess('Profile updated.')
      return
    }

    if (refreshed.profile_complete) {
      navigate('/jobs')
      return
    }

    setSuccess(
      'Profile saved. Finish the remaining required fields to unlock jobs.'
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f1e5]">
        <JobseekerHeader />
        <main className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6">
          <LoadingState title="Loading your jobseeker profile..." />
        </main>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-[#f7f1e5]">
        <JobseekerHeader />
        <main className="mx-auto w-full max-w-[1260px] px-4 py-8 sm:px-6">
          <ErrorState title="Profile unavailable" message={error} />
        </main>
      </div>
    )
  }

  if (!profile || !draft) return null

  return (
    <div className="min-h-screen bg-[#f7f1e5]">
      <JobseekerHeader />

      <main className="mx-auto w-full max-w-[1260px] px-4 py-8 pb-12 sm:px-6">
        {!isEditing && profile.profile_complete ? (
          <div className="space-y-6">
            <section
              className="overflow-hidden rounded-[28px] border border-[#1f3145] shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              style={{ backgroundColor: '#132130' }}
            >
              <PanelBody className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-5">
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl font-semibold text-white">
                    {getInitials(
                      profile.full_name ?? auth.authMe?.app_user?.email
                    )}
                  </div>
                  <div>
                    <h1 className="jobseeker-display text-[2.6rem] leading-none font-semibold text-white">
                      {profile.full_name ?? 'Your profile'}
                    </h1>
                    <p className="mt-3 text-sm text-[#cfdbeb]">
                      Member since {formatMonthYear(profile.created_at)}.{' '}
                      <span className="capitalize">{profile.status}</span>{' '}
                      jobseeker
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PortalBadge tone="success">Profile complete</PortalBadge>
                      <PortalBadge tone={statusTone(profile.status)}>
                        {profile.status}
                      </PortalBadge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <PortalButton
                    onClick={() => {
                      setError(null)
                      setSuccess(null)
                      setStep(2)
                      setWizardMode('edit')
                      setIsEditing(true)
                    }}
                  >
                    Edit Profile
                  </PortalButton>
                  <PortalButton
                    variant="secondary"
                    onClick={() => {
                      void auth.logout().catch((nextError) => {
                        toast.error(
                          nextError instanceof Error
                            ? nextError.message
                            : 'Unable to sign out right now.'
                        )
                      })
                    }}
                  >
                    Sign Out
                  </PortalButton>
                </div>
              </PanelBody>
            </section>

            {success ? (
              <InlineNotice tone="success">{success}</InlineNotice>
            ) : null}

            <Surface>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Contact information
                  </p>
                  <h2 className="jobseeker-display mt-2 text-[1.8rem] font-semibold text-slate-950">
                    How TWA reaches you
                  </h2>
                </div>
                <PortalBadge tone="warning">Portal preview</PortalBadge>
              </div>
              <DefinitionList
                className="mt-6"
                items={[
                  { label: 'Full Name', value: profile.full_name ?? 'Not set' },
                  {
                    label: 'Email',
                    value: auth.authMe?.app_user?.email ?? 'Not set',
                  },
                  { label: 'Phone', value: profile.phone ?? 'Not set' },
                  {
                    label: 'Preferred Contact',
                    value: draft.preferred_contact,
                  },
                ]}
              />
            </Surface>

            <Surface>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Location & transportation
                </p>
                <h2 className="jobseeker-display mt-2 text-[1.8rem] font-semibold text-slate-950">
                  Where you can work from
                </h2>
              </div>
              <DefinitionList
                className="mt-6"
                items={[
                  { label: 'Address', value: profile.address ?? 'Not set' },
                  { label: 'City', value: profile.city ?? 'Not set' },
                  { label: 'ZIP Code', value: profile.zip ?? 'Not set' },
                  {
                    label: 'Transportation',
                    value:
                      profile.transit_type === 'own_car'
                        ? 'Own vehicle'
                        : profile.transit_type === 'both'
                          ? 'Public transit and own vehicle'
                          : profile.transit_type === 'public_transit'
                            ? 'Public transit'
                            : 'Not set',
                  },
                ]}
              />
            </Surface>

            <Surface>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                  Background information
                </p>
                <h2 className="jobseeker-display mt-2 text-[1.8rem] font-semibold text-slate-950">
                  Private matching details
                </h2>
              </div>
              <DefinitionList
                className="mt-6"
                items={[
                  {
                    label: 'Selected Categories',
                    value: selectedChargeSummary,
                  },
                  {
                    label: 'Visibility',
                    value: 'Private to your TWA support workflow',
                  },
                ]}
              />
            </Surface>

            <Surface className="border-[#ead6a8] bg-[#fff9e9]">
              <p className="text-sm leading-7 text-[#8d6a20]">
                Your background information is securely stored and only visible
                to your TWA case manager and internal workflow. It is never
                shown publicly inside this portal.
              </p>
            </Surface>

            <JobseekerMfaSection />
          </div>
        ) : (
          <div className="space-y-6">
            <Surface className="text-center">
              <div className="mx-auto max-w-[720px]">
                <h1 className="jobseeker-display mt-6 text-[3rem] leading-[0.98] font-semibold text-slate-950">
                  {wizardMode === 'edit'
                    ? 'Update your profile'
                    : 'Set up your profile'}
                </h1>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-3 lg:gap-0">
                {setupSteps.map((item, index) => {
                  const complete = item.id < step
                  const current = item.id === step
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold ${
                            complete || current
                              ? 'border-[#d0922c] bg-[#132130] text-white'
                              : 'border-[#d8ccb9] bg-white text-slate-400'
                          }`}
                        >
                          {complete ? <Check className="h-5 w-5" /> : item.id}
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            current || complete
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {index < setupSteps.length - 1 ? (
                        <div className="hidden h-px w-16 bg-[#ddcfba] lg:block" />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </Surface>

            {success ? (
              <InlineNotice tone="success">{success}</InlineNotice>
            ) : null}
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            <PortalPanel className="mx-auto max-w-[760px]">
              <PanelBody className="space-y-6">
                {step === 1 ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Account
                      </p>
                      <h2 className="jobseeker-display mt-2 text-[2rem] font-semibold text-slate-950">
                        Confirm your portal account
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        Your account is ready. Next, you&apos;ll add the profile
                        details TWA uses for job matching.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          Email
                        </p>
                        <p className="mt-3 text-base font-medium text-slate-900">
                          {auth.authMe?.app_user?.email ?? 'Not available'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          Profile status
                        </p>
                        <div className="mt-3">
                          <PortalBadge tone="warning">
                            Setup in progress
                          </PortalBadge>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <PortalButton
                        disabled={isSaving}
                        onClick={() => void handleNext()}
                      >
                        Next: Personal Info
                      </PortalButton>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Personal information
                      </p>
                      <h2 className="jobseeker-display mt-2 text-[2rem] font-semibold text-slate-950">
                        How should TWA reach you?
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          First name
                        </label>
                        <input
                          className={inputClassName}
                          value={draft.first_name}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              first_name: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          Last name
                        </label>
                        <input
                          className={inputClassName}
                          value={draft.last_name}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              last_name: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Phone number
                      </label>
                      <input
                        className={inputClassName}
                        value={draft.phone}
                        onChange={(event) =>
                          setDraft({ ...draft, phone: event.target.value })
                        }
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          Preferred contact
                        </label>
                        <PortalBadge tone="warning">
                          Frontend placeholder
                        </PortalBadge>
                      </div>
                      <select
                        className={inputClassName}
                        value={draft.preferred_contact}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            preferred_contact: event.target
                              .value as PreferredContact,
                          })
                        }
                      >
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Text">Text</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3">
                      <PortalButton
                        variant="secondary"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </PortalButton>
                      <PortalButton
                        disabled={isSaving}
                        onClick={() => void handleNext()}
                      >
                        {isSaving ? 'Saving...' : 'Next: Location & Transit'}
                      </PortalButton>
                    </div>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Location & transit
                      </p>
                      <h2 className="jobseeker-display mt-2 text-[2rem] font-semibold text-slate-950">
                        Where can you realistically work from?
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        We use this to surface jobs you can actually reach.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Address
                      </label>
                      <input
                        autoComplete="street-address"
                        className={inputClassName}
                        name="address"
                        value={draft.address}
                        onChange={(event) =>
                          setDraft({ ...draft, address: event.target.value })
                        }
                        onBlur={(event) =>
                          setDraft({
                            ...draft,
                            address: normalizeSingleLineText(
                              event.target.value
                            ),
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          City
                        </label>
                        <input
                          autoComplete="address-level2"
                          className={inputClassName}
                          name="city"
                          value={draft.city}
                          onChange={(event) =>
                            setDraft({ ...draft, city: event.target.value })
                          }
                          onBlur={(event) =>
                            setDraft({
                              ...draft,
                              city: normalizeSingleLineText(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                          ZIP code
                        </label>
                        <input
                          autoComplete="postal-code"
                          className={inputClassName}
                          inputMode="numeric"
                          maxLength={10}
                          name="zip"
                          value={draft.zip}
                          onChange={(event) =>
                            setDraft({ ...draft, zip: event.target.value })
                          }
                          onBlur={(event) =>
                            setDraft({
                              ...draft,
                              zip: normalizeUsZipInput(event.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Transportation access
                      </label>
                      <div className="grid gap-4 md:grid-cols-3">
                        {[
                          {
                            key: 'public_transit' as const,
                            title: 'Public Transit',
                            description:
                              'I rely on MetroBus, MetroLink, or another transit option.',
                          },
                          {
                            key: 'own_car' as const,
                            title: 'Own Vehicle',
                            description:
                              'I have reliable access to a personal vehicle.',
                          },
                          {
                            key: 'both' as const,
                            title: 'Both',
                            description:
                              'I can use either public transit or my own vehicle.',
                          },
                        ].map((option) => {
                          const active = draft.transit_type === option.key
                          return (
                            <button
                              key={option.key}
                              className={`rounded-[22px] border px-4 py-5 text-left transition ${
                                active
                                  ? 'border-[#d0922c] bg-[#fff8ea] shadow-[0_8px_20px_rgba(208,146,44,0.12)]'
                                  : 'border-[#ddd1be] bg-white hover:border-[#cfbeaa] hover:bg-[#faf7f1]'
                              }`}
                              type="button"
                              onClick={() =>
                                setDraft({ ...draft, transit_type: option.key })
                              }
                            >
                              <p className="text-base font-semibold text-slate-950">
                                {option.title}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                {option.description}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3">
                      <PortalButton
                        variant="secondary"
                        onClick={() => setStep(2)}
                      >
                        Back
                      </PortalButton>
                      <PortalButton
                        disabled={isSaving}
                        onClick={() => void handleNext()}
                      >
                        {isSaving ? 'Saving...' : 'Next: Background'}
                      </PortalButton>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                        Background information
                      </p>
                      <h2 className="jobseeker-display mt-2 text-[2rem] font-semibold text-slate-950">
                        Private matching information
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        This step is sensitive. Please read carefully before
                        selecting.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#edd08d] bg-[#fff8dc] px-5 py-5 text-sm leading-7 text-[#8d6a20]">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-1 h-5 w-5 shrink-0" />
                        <p>
                          <strong>Your privacy is protected.</strong> This
                          information is only shared within your TWA case
                          management workflow and is used to avoid surfacing
                          jobs that are not a fit for your background.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {chargeOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#ddd1be] bg-white px-4 py-4"
                        >
                          <input
                            checked={draft.charges[option.key]}
                            className="h-4 w-4 rounded border-[#d8ccb9]"
                            type="checkbox"
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                charges: {
                                  ...draft.charges,
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

                    <div className="flex flex-wrap justify-between gap-3">
                      <PortalButton
                        variant="secondary"
                        onClick={() => setStep(3)}
                      >
                        Back
                      </PortalButton>
                      <PortalButton
                        disabled={isSaving}
                        onClick={() => void handleNext()}
                      >
                        {isSaving
                          ? 'Saving...'
                          : wizardMode === 'edit'
                            ? 'Save Changes'
                            : 'Complete Setup'}
                      </PortalButton>
                    </div>
                  </>
                ) : null}
              </PanelBody>
            </PortalPanel>

            <div className="mx-auto max-w-[760px]">
              <JobseekerMfaSection />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
