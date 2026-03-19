import type { ChargeFlags } from '../types/admin'

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
  return new Date(value).toLocaleDateString()
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

export function formatStatusLabel(value: string) {
  return value.replaceAll('_', ' ')
}

export function reviewTone(value: 'pending' | 'approved' | 'rejected') {
  if (value === 'approved') return 'success' as const
  if (value === 'rejected') return 'danger' as const
  return 'warning' as const
}

export function lifecycleTone(value: 'open' | 'closed') {
  return value === 'open' ? ('success' as const) : ('neutral' as const)
}

export function applicationTone(value: 'submitted' | 'reviewed' | 'hired') {
  if (value === 'hired') return 'success' as const
  if (value === 'reviewed') return 'info' as const
  return 'warning' as const
}
