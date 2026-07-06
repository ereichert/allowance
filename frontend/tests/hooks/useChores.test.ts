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
  },
  {
    id: 'c2',
    description: 'Wash dishes',
    value_cents: 150,
    recurrence_cron: '@daily',
    is_active: false,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
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
    const { result } = renderHook(() => useChores())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.chores).toEqual(stubChores)
    expect(result.current.error).toBeNull()
  })

  it('sets error when the API rejects', async () => {
    mockListChores.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderHook(() => useChores())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.chores).toEqual([])
    expect(result.current.error).toBe('network error')
  })

  it('fetches page 1 at the max page size on mount', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    renderHook(() => useChores())

    await waitFor(() => expect(mockListChores).toHaveBeenCalledWith(1, 100))
  })

  it('computes total pages from total and per_page', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, per_page: 100 }))
    const { result } = renderHook(() => useChores())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totalPages).toBe(3)
  })

  it('defaults to 1 total page when there are no chores', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ items: [], total: 0 }))
    const { result } = renderHook(() => useChores())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totalPages).toBe(1)
  })

  it('fetches the next page when goToNextPage is called', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250 }))
    const { result } = renderHook(() => useChores())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, page: 2 }))
    act(() => {
      result.current.goToNextPage()
    })

    await waitFor(() => expect(result.current.page).toBe(2))
    expect(mockListChores).toHaveBeenLastCalledWith(2, 100)
  })

  it('does not advance past the last page', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 100, per_page: 100 }))
    const { result } = renderHook(() => useChores())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totalPages).toBe(1)
    act(() => {
      result.current.goToNextPage()
    })

    expect(result.current.page).toBe(1)
    expect(mockListChores).toHaveBeenCalledTimes(1)
  })

  it('fetches the previous page when goToPreviousPage is called', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250 }))
    const { result } = renderHook(() => useChores())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, page: 2 }))
    act(() => {
      result.current.goToNextPage()
    })
    await waitFor(() => expect(result.current.page).toBe(2))

    mockListChores.mockResolvedValueOnce(makeResponse({ total: 250, page: 1 }))
    act(() => {
      result.current.goToPreviousPage()
    })

    await waitFor(() => expect(result.current.page).toBe(1))
    expect(mockListChores).toHaveBeenLastCalledWith(1, 100)
  })

  it('does not go before the first page', async () => {
    mockListChores.mockResolvedValueOnce(makeResponse())
    const { result } = renderHook(() => useChores())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.goToPreviousPage()
    })

    expect(result.current.page).toBe(1)
    expect(mockListChores).toHaveBeenCalledTimes(1)
  })
})
