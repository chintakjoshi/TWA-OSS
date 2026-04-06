import { expect, test } from 'vitest'

import { formatTransitRequirement } from './formatting'

test('formatTransitRequirement describes listings without a car requirement clearly', () => {
  expect(formatTransitRequirement('any')).toBe('No personal vehicle required')
})
