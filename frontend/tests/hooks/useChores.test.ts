import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChores } from '../../src/hooks/useChores'
import * as choreApi from '../../src/api/chores'
import type { ChoresListResponse } from '../../src/types/chore'

vi.mock('../../src/api/chores')

const mockListChores = vi.mocked(choreApi.listChores)

const stubChores = [
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

function makeResponse(overrides: Partial<ChoresListResponse> = {}): ChoresListResponse {
  return { items: stubChores, total: 2, page: 1, per_page: 100, ...overrides }
}

describe('useChores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts loading and returns chores when resolved', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    const { result } = renderHook(() => useChores(1))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.chores).toEqual(stubChores)
    expect(result.current.error).toBeNull()
  })

  it('sets error when the API rejects', async () => {
    mockListChores.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderHook(() => useChores(1))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.chores).toEqual([])
    expect(result.current.error).toBe('network error')
  })

  it('fetches the given page at the max page size', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    renderHook(() => useChores(1))

    await waitFor(() => expect(mockListChores).toHaveBeenCalledWith(1, 100))
  })

  it('computes total pages from total and per_page', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, per_page: 100 }))
    const { result } = renderHook(() => useChores(1))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totalPages).toBe(3)
  })

  it('defaults to 1 total page when there are no chores', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ items: [], total: 0 }))
    const { result } = renderHook(() => useChores(1))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totalPages).toBe(1)
  })

  it('refetches when the page argument changes across a rerender', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, page: 1 }))
    const { result, rerender } = renderHook(({ page }) => useChores(page), {
      initialProps: { page: 1 },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, page: 2 }))
    rerender({ page: 2 })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockListChores).toHaveBeenLastCalledWith(2, 100)
  })

  it('refetch re-invokes listChores with the same page', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    const { result } = renderHook(() => useChores(1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListChores.mockResolvedValueOnce(makeResponse())
    act(() => {
      result.current.refetch()
    })

    await waitFor(() => expect(mockListChores).toHaveBeenCalledTimes(2))
    expect(mockListChores).toHaveBeenLastCalledWith(1, 100)
  })

  it('refetch does not show the loading state', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    const { result } = renderHook(() => useChores(1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListChores.mockResolvedValueOnce(makeResponse())
    act(() => {
      result.current.refetch()
    })

    expect(result.current.loading).toBe(false)
    await waitFor(() => expect(mockListChores).toHaveBeenCalledTimes(2))
  })
})
