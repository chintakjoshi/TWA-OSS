import type { ChargeFlags } from '../types/employer'

const chargeLabels: Array<{ key: keyof ChargeFlags; label: string }> = [
  { key: 'sex_offense', label: 'Sex offense' },
  { key: 'violent', label: 'Violent offense' },
  { key: 'armed', label: 'Armed offense' },
  { key: 'children', label: 'Children-related offense' },
  { key: 'drug', label: 'Drug offense' },
  { key: 'theft', label: 'Theft offense' },
]

export function formatChargeFlags(flags: ChargeFlags): string[] {
  return chargeLabels.filter((item) => flags[item.key]).map((item) => item.label)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString()
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

export function formatTransitRequirement(value: 'own_car' | 'any'): string {
  return value === 'own_car' ? 'Own car required' : 'Any transit option'
}

export function formatTransitAccessibility(value: boolean | null): string {
  if (value === null) return 'Not computed yet'
  return value ? 'Transit accessible' : 'Transit accessibility not detected'
}

export function formatStatusLabel(value: string): string {
  return value.replaceAll('_', ' ')
}
