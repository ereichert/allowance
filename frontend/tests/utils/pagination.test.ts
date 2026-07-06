import { describe, it, expect } from 'vitest'
import { parsePageParam } from '../../src/utils/pagination'

describe('parsePageParam', () => {
  it('returns the page number when given a valid positive integer string', () => {
    expect(parsePageParam('3')).toBe(3)
  })

  it('defaults to 1 when given null', () => {
    expect(parsePageParam(null)).toBe(1)
  })

  it('defaults to 1 when given an empty string', () => {
    expect(parsePageParam('')).toBe(1)
  })

  it('defaults to 1 when given a non-numeric string', () => {
    expect(parsePageParam('abc')).toBe(1)
  })

  it('defaults to 1 when given zero', () => {
    expect(parsePageParam('0')).toBe(1)
  })

  it('defaults to 1 when given a negative number', () => {
    expect(parsePageParam('-5')).toBe(1)
  })

  it('defaults to 1 when given a non-integer number', () => {
    expect(parsePageParam('3.5')).toBe(1)
  })

  it('parses a multi-digit page number', () => {
    expect(parsePageParam('42')).toBe(42)
  })
})
