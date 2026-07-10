/** Recurrence select value. `custom` pairs with a free-text cron expression. */
export type RecurrenceKind = 'one_time' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

// Must match the canonical cron strings in Recurrence::to_cron/from_cron (allowance-domain).
const CANONICAL_CRON: Record<'daily' | 'weekly' | 'biweekly' | 'monthly', string> = {
  daily: '@daily',
  weekly: '@weekly',
  biweekly: '0 0 1,15 * *',
  monthly: '@monthly',
}

export function classifyRecurrence(cron: string | null): {
  kind: RecurrenceKind
  customCron: string
} {
  if (cron === null) return { kind: 'one_time', customCron: '' }

  const match = (Object.entries(CANONICAL_CRON) as [RecurrenceKind, string][]).find(
    ([, value]) => value === cron,
  )
  if (match) return { kind: match[0], customCron: '' }

  return { kind: 'custom', customCron: cron }
}

/** Inverse of `classifyRecurrence`. */
export function toCronValue(kind: RecurrenceKind, customCron: string): string | null {
  if (kind === 'one_time') return null
  if (kind === 'custom') return customCron.trim()
  return CANONICAL_CRON[kind]
}
