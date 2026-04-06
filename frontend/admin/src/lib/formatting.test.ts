import { expect, test } from 'vitest'

import { describeMatchReason } from './formatting'

test('describeMatchReason maps the own-car reason emitted by the backend', () => {
  expect(describeMatchReason('requires_own_car')).toBe(
    'Job requires own vehicle'
  )
})
