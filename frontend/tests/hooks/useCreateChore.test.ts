import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useCreateChore } from '../../src/hooks/useCreateChore'
import * as choreApi from '../../src/api/chores'

vi.mock('../../src/api/chores')

const mockCreateChore = vi.mocked(choreApi.createChore)

const stubChore = {
  id: 'abc',
  description: 'Sweep',
  value_cents: 0,
  recurrence_cron: null,
  is_active: true,
  created_at: '2026-04-02T00:00:00Z',
  updated_at: '2026-04-02T00:00:00Z',
}

describe('useCreateChore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useCreateChore())
    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
  })

  it('transitions to success state and returns "success" on valid submit', async () => {
    mockCreateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useCreateChore())

    let returnValue: 'success' | 'error' | undefined
    await act(async () => {
      returnValue = await result.current.submit({ description: 'Sweep', value_cents: 0 })
    })

    expect(result.current.status).toBe('success')
    expect(returnValue).toBe('success')
    expect(result.current.errorMessage).toBeNull()
  })

  it('transitions to error state and returns "error" when the API rejects', async () => {
    mockCreateChore.mockRejectedValueOnce(new Error('server exploded'))
    const { result } = renderHook(() => useCreateChore())

    let returnValue: 'success' | 'error' | undefined
    await act(async () => {
      returnValue = await result.current.submit({ description: 'Sweep' })
    })

    expect(result.current.status).toBe('error')
    expect(returnValue).toBe('error')
    expect(result.current.errorMessage).toBe('server exploded')
  })

  it('reset returns to idle state', async () => {
    mockCreateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useCreateChore())

    await act(async () => {
      await result.current.submit({ description: 'Sweep' })
    })
    expect(result.current.status).toBe('success')

    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
  })

  it('calls createChore with the provided input', async () => {
    mockCreateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useCreateChore())

    const input = {
      description: 'Walk dog',
      value_cents: 150,
      due_at: '2026-04-05T18:00:00Z',
      assignee_ids: ['uuid-1'],
    }
    await act(async () => {
      await result.current.submit(input)
    })

    expect(mockCreateChore).toHaveBeenCalledWith(input)
  })
})
