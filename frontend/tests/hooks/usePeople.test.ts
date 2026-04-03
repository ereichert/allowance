import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { usePeople } from '../../src/hooks/usePeople'
import * as choreApi from '../../src/api/chores'

vi.mock('../../src/api/chores')

const mockListPeople = vi.mocked(choreApi.listPeople)

const stubPeople = [
  { id: 'p1', name: 'Alice', role: 'Child' as const, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob', role: 'Admin' as const, created_at: '2026-01-01T00:00:00Z' },
]

describe('usePeople', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts loading and returns people when resolved', async () => {
    mockListPeople.mockResolvedValueOnce(stubPeople)
    const { result } = renderHook(() => usePeople())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.people).toEqual(stubPeople)
    expect(result.current.error).toBeNull()
  })

  it('sets error when the API rejects', async () => {
    mockListPeople.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderHook(() => usePeople())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.people).toEqual([])
    expect(result.current.error).toBe('network error')
  })
})
