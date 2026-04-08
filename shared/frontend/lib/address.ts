const WHITESPACE_PATTERN = /\s+/g
const ZIP_ALLOWED_CHARACTERS_PATTERN = /^[\d\s-]+$/
const NON_DIGIT_PATTERN = /\D/g

export function normalizeSingleLineText(value: string): string {
  return value.replace(WHITESPACE_PATTERN, ' ').trim()
}

export function normalizeUsZipInput(value: string): string {
  const normalized = normalizeSingleLineText(value)
  if (!normalized) return ''
  if (!ZIP_ALLOWED_CHARACTERS_PATTERN.test(normalized)) {
    return normalized
  }

  const digits = normalized.replace(NON_DIGIT_PATTERN, '')
  if (digits.length === 5) return digits
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  if (digits.length < 5) {
    return digits
  }
  return normalized
}
