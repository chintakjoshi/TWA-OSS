export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatMonthYear(value: string | null | undefined) {
  if (!value) return 'New member'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function getInitials(value: string | null | undefined) {
  if (!value) return 'TW'
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || 'TW'
}

export function formatTransitRequirementLabel(
  value: 'own_car' | 'any'
): string {
  return value === 'own_car' ? 'Own car required' : 'No car required'
}

export function formatTransitRequirementDescription(
  value: 'own_car' | 'any'
): string {
  return value === 'own_car'
    ? 'This listing requires access to a personal vehicle.'
    : 'This listing does not require access to a personal vehicle.'
}

export function formatTransitAccessibilityLabel(value: boolean | null): string {
  if (value === true) return 'Transit accessible'
  if (value === false) return 'Transit unavailable'
  return 'Transit info pending'
}

export function formatTransitAccessibilityDescription(
  value: boolean | null
): string {
  if (value === true) {
    return 'Transit access has been marked available for this listing.'
  }
  if (value === false) {
    return 'Transit access is not currently available for this listing.'
  }
  return 'Transit accessibility has not been computed yet.'
}
