import { describe, it, expect } from 'vitest'
import { formatTimestamp } from '../../src/utils/datetime'

describe('formatTimestamp', () => {
  it('formats an ISO timestamp as UTC date and time', () => {
    expect(formatTimestamp('2026-01-01T00:00:00Z')).toBe('2026-01-01 00:00 UTC')
  })

  it('zero-pads single-digit hours and minutes', () => {
    expect(formatTimestamp('2026-01-02T08:05:00Z')).toBe('2026-01-02 08:05 UTC')
  })

  it('is unaffected by the host timezone', () => {
    expect(formatTimestamp('2026-06-15T23:45:00Z')).toBe('2026-06-15 23:45 UTC')
  })
})
