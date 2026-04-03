import { vi, describe, it, expect, beforeEach } from 'vitest'
import { listPeople, createChore } from '../../src/api/chores'
import type { Person } from '../../src/types/person'

const stubPeople: Person[] = [
  { id: 'p1', name: 'Alice', role: 'Child', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob', role: 'Admin', created_at: '2026-01-01T00:00:00Z' },
]

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  )
}

describe('listPeople', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the items array from the paginated response', async () => {
    mockFetch({ items: stubPeople, total: 2, page: 1, per_page: 20 })

    const result = await listPeople()

    expect(result).toEqual(stubPeople)
  })

  it('returns an empty array when items is empty', async () => {
    mockFetch({ items: [], total: 0, page: 1, per_page: 20 })

    const result = await listPeople()

    expect(result).toEqual([])
  })
})

describe('createChore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to /chores and returns the created chore', async () => {
    const stubChore = {
      id: 'c1',
      description: 'Take out trash',
      value_cents: 100,
      recurrence_cron: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    mockFetch(stubChore, 201)

    const result = await createChore({ description: 'Take out trash', value_cents: 100 })

    expect(result).toEqual(stubChore)
  })
})
