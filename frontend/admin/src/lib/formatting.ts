import type { ChargeFlags } from '../types/admin'

type ReviewStatus = 'pending' | 'approved' | 'rejected'
type LifecycleStatus = 'open' | 'closed'
type ApplicationStatus = 'submitted' | 'reviewed' | 'hired'

const chargeLabels: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed offense' },
  { key: 'children', label: 'Children-related offense' },
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
]

export function formatChargeFlags(flags: ChargeFlags): string[] {
  return chargeLabels
    .filter((item) => flags[item.key])
    .map((item) => item.label)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatStatusLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function formatMonthLabel(value: string | null | undefined) {
  if (!value) return 'Unknown month'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function reviewTone(value: ReviewStatus) {
  if (value === 'approved') return 'success' as const
  if (value === 'rejected') return 'danger' as const
  return 'warning' as const
}

export function lifecycleTone(value: LifecycleStatus) {
  return value === 'open' ? ('active' as const) : ('neutral' as const)
}

export function applicationTone(value: ApplicationStatus) {
  if (value === 'hired') return 'success' as const
  if (value === 'reviewed') return 'active' as const
  return 'info' as const
}

export function describeMatchReason(reason: string) {
  const mapped: Record<string, string> = {
    charge_sex_offense_disqualified: 'Disqualified by sex offense restriction',
    charge_violent_disqualified: 'Disqualified by violent offense restriction',
    charge_armed_disqualified: 'Disqualified by armed offense restriction',
    charge_children_disqualified:
      'Disqualified by children-related restriction',
    charge_drug_disqualified: 'Disqualified by drug offense restriction',
    charge_theft_disqualified: 'Disqualified by theft restriction',
    transit_unreachable: 'Transit route unavailable',
    transit_data_unavailable: 'Transit data unavailable',
    profile_incomplete: 'Jobseeker profile incomplete',
    own_car_required: 'Job requires own vehicle',
  }
  return mapped[reason] ?? formatStatusLabel(reason)
}

export function describeAuditAction(action: string) {
  const normalized = action.replaceAll('.', '_')
  const mapped: Record<string, string> = {
    employer_approved: 'Employer approved',
    employer_rejected: 'Employer rejected',
    listing_approved: 'Listing approved',
    listing_rejected: 'Listing rejected',
    listing_closed: 'Listing closed',
    application_submitted: 'Application submitted',
    application_reviewed: 'Application reviewed',
    application_hired: 'Jobseeker marked hired',
    admin_jobseeker_updated: 'Jobseeker profile updated',
    notification_config_updated: 'Notification settings updated',
    gtfs_feed_refreshed: 'GTFS feed refreshed',
  }
  return mapped[normalized] ?? formatStatusLabel(normalized)
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  const deltaMs = Date.now() - date.getTime()
  const minutes = Math.round(deltaMs / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  return formatDateTime(value)
}
