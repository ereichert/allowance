import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChores } from '../../src/hooks/useChores'
import * as choreApi from '../../src/api/chores'

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

describe('useChores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts loading and returns chores when resolved', async () => {
    mockListChores.mockResolvedValueOnce(stubChores)
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
})
