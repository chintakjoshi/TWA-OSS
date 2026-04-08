import { expect, test } from 'vitest'

import { normalizeSingleLineText, normalizeUsZipInput } from './address'

test('normalizeSingleLineText trims and collapses whitespace', () => {
  expect(normalizeSingleLineText('  500   Market   St  ')).toBe('500 Market St')
  expect(normalizeSingleLineText('')).toBe('')
})

test('normalizeUsZipInput formats ZIP+4 values and preserves invalid text for validation', () => {
  expect(normalizeUsZipInput(' 63101 1234 ')).toBe('63101-1234')
  expect(normalizeUsZipInput('63101')).toBe('63101')
  expect(normalizeUsZipInput('63A10')).toBe('63A10')
})
