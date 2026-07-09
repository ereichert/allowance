import { vi, describe, it, expect, beforeEach } from 'vitest'
import { listPeople, createChore, listChores } from '../../src/api/chores'
import type { Person } from '../../src/types/person'
import type { ChoreListItem } from '../../src/types/chore'

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

describe('listChores', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  const stubChores: ChoreListItem[] = [
    {
      id: 'c1',
      description: 'Take out trash',
      value_cents: 100,
      recurrence_cron: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      assignees: [],
    },
    {
      id: 'c2',
      description: 'Wash dishes',
      value_cents: 150,
      recurrence_cron: '@daily',
      is_active: false,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      assignees: [{ id: 'p1', name: 'Alice' }],
    },
  ]

  it('returns the full paginated response', async () => {
    const response = { items: stubChores, total: 2, page: 1, per_page: 100 }
    mockFetch(response)

    const result = await listChores()

    expect(result).toEqual(response)
  })

  it('defaults to page 1 with the max page size', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, per_page: 100 }),
    })
    vi.stubGlobal('fetch', fetchSpy)

    await listChores()

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('page=1'), expect.anything())
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('per_page=100'),
      expect.anything(),
    )
  })

  it('requests the given page and page size', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 2, per_page: 50 }),
    })
    vi.stubGlobal('fetch', fetchSpy)

    await listChores(2, 50)

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything())
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('per_page=50'),
      expect.anything(),
    )
  })

  it('returns an empty items array when there are no chores', async () => {
    mockFetch({ items: [], total: 0, page: 1, per_page: 100 })

    const result = await listChores()

    expect(result.items).toEqual([])
  })
})
