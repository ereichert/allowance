import { describe, it, expect } from 'vitest'
import { formatValue } from '../../src/utils/currency'

describe('formatValue', () => {
  it('formats whole dollar amounts', () => {
    expect(formatValue(200)).toBe('$2.00')
  })

  it('formats amounts with cents', () => {
    expect(formatValue(150)).toBe('$1.50')
  })

  it('formats zero as $0.00', () => {
    expect(formatValue(0)).toBe('$0.00')
  })

  it('formats amounts under a dollar', () => {
    expect(formatValue(5)).toBe('$0.05')
  })

  it('inserts thousands separators for large amounts', () => {
    expect(formatValue(123456789)).toBe('$1,234,567.89')
  })
})
