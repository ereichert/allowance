import { describe, it, expect } from 'vitest'
import { classifyRecurrence, toCronValue } from '../../src/utils/recurrence'

describe('classifyRecurrence', () => {
  it('classifies null as one_time', () => {
    expect(classifyRecurrence(null)).toEqual({ kind: 'one_time', customCron: '' })
  })

  it('classifies @daily as daily', () => {
    expect(classifyRecurrence('@daily')).toEqual({ kind: 'daily', customCron: '' })
  })

  it('classifies @weekly as weekly', () => {
    expect(classifyRecurrence('@weekly')).toEqual({ kind: 'weekly', customCron: '' })
  })

  it('classifies the biweekly sentinel as biweekly', () => {
    expect(classifyRecurrence('0 0 1,15 * *')).toEqual({ kind: 'biweekly', customCron: '' })
  })

  it('classifies @monthly as monthly', () => {
    expect(classifyRecurrence('@monthly')).toEqual({ kind: 'monthly', customCron: '' })
  })

  it('classifies an unrecognized cron string as custom, preserving it', () => {
    expect(classifyRecurrence('0 9 * * 1-5')).toEqual({ kind: 'custom', customCron: '0 9 * * 1-5' })
  })
})

describe('toCronValue', () => {
  it('converts one_time to null', () => {
    expect(toCronValue('one_time', '')).toBeNull()
  })

  it('converts daily to @daily', () => {
    expect(toCronValue('daily', '')).toBe('@daily')
  })

  it('converts weekly to @weekly', () => {
    expect(toCronValue('weekly', '')).toBe('@weekly')
  })

  it('converts biweekly to the biweekly sentinel', () => {
    expect(toCronValue('biweekly', '')).toBe('0 0 1,15 * *')
  })

  it('converts monthly to @monthly', () => {
    expect(toCronValue('monthly', '')).toBe('@monthly')
  })

  it('converts custom to the trimmed custom cron string', () => {
    expect(toCronValue('custom', '  0 9 * * 1-5  ')).toBe('0 9 * * 1-5')
  })
})

describe('classifyRecurrence and toCronValue round trip', () => {
  it.each([null, '@daily', '@weekly', '0 0 1,15 * *', '@monthly', '0 9 * * 1-5'])(
    'round trips %s',
    (cron) => {
      const { kind, customCron } = classifyRecurrence(cron)
      expect(toCronValue(kind, customCron)).toBe(cron)
    },
  )
})
