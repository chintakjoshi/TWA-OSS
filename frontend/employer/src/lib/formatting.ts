import type {
  ChargeFlags,
  EmployerApplicant,
  JobListing,
} from '../types/employer'

const chargeLabels: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed criminal action (ACA)' },
  { key: 'children', label: 'Offense involving a child' },
  { key: 'drug', label: 'Drug charge / substance offense' },
  { key: 'theft', label: 'Theft or robbery' },
]

export function formatChargeFlags(flags: ChargeFlags): string[] {
  return chargeLabels
    .filter((item) => flags[item.key])
    .map((item) => item.label)
}

export function formatChargeSummary(flags: ChargeFlags) {
  const labels = formatChargeFlags(flags)
  return labels.length > 0 ? labels.join(', ') : 'No disqualifying categories'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTransitRequirement(value: 'own_car' | 'any'): string {
  return value === 'own_car'
    ? 'Own vehicle required'
    : 'No personal vehicle required'
}

export function describeTransitRequirement(value: 'own_car' | 'any'): string {
  return value === 'own_car'
    ? 'Candidates need reliable personal transportation.'
    : 'Candidates do not need a personal vehicle for this role.'
}

export function formatTransitAccessibility(value: boolean | null): string {
  if (value === null) return 'Transit check pending'
  return value ? 'Transit accessible' : 'Transit access not detected'
}

export function formatTransitType(
  value: EmployerApplicant['jobseeker']['transit_type']
) {
  if (value === 'own_car') return 'Own car'
  if (value === 'public_transit') return 'Public transit'
  if (value === 'both') return 'Public transit and car'
  return 'Not set'
}

export function formatStatusLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getStatusTone(
  value: 'pending' | 'approved' | 'rejected' | 'open' | 'closed'
) {
  if (value === 'approved' || value === 'open') return 'success' as const
  if (value === 'rejected') return 'danger' as const
  if (value === 'closed') return 'neutral' as const
  return 'warning' as const
}

export function getApplicationTone(status: EmployerApplicant['status']) {
  if (status === 'hired') return 'success' as const
  if (status === 'reviewed') return 'info' as const
  return 'warning' as const
}

export function getInitials(label: string | null | undefined) {
  if (!label) return 'TW'
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function isListingVisible(listing: JobListing) {
  return (
    listing.review_status === 'approved' && listing.lifecycle_status === 'open'
  )
}
