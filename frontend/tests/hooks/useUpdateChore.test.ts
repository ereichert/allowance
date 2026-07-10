import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useUpdateChore } from '../../src/hooks/useUpdateChore'
import * as choreApi from '../../src/api/chores'

vi.mock('../../src/api/chores')

const mockUpdateChore = vi.mocked(choreApi.updateChore)

const stubChore = {
  id: 'abc',
  description: 'Sweep',
  value_cents: 0,
  recurrence_cron: null,
  is_active: true,
  created_at: '2026-04-02T00:00:00Z',
  updated_at: '2026-04-02T00:00:00Z',
  assignees: [],
}

const input = {
  description: 'Sweep',
  value_cents: 0,
  is_active: true,
  recurrence_cron: null,
  assignee_ids: [],
}

describe('useUpdateChore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useUpdateChore())
    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
  })

  it('transitions to success state and returns "success" on valid submit', async () => {
    mockUpdateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useUpdateChore())

    let returnValue: 'success' | 'error' | undefined
    await act(async () => {
      returnValue = await result.current.submit('abc', input)
    })

    expect(result.current.status).toBe('success')
    expect(returnValue).toBe('success')
    expect(result.current.errorMessage).toBeNull()
  })

  it('transitions to error state and returns "error" when the API rejects', async () => {
    mockUpdateChore.mockRejectedValueOnce(new Error('server exploded'))
    const { result } = renderHook(() => useUpdateChore())

    let returnValue: 'success' | 'error' | undefined
    await act(async () => {
      returnValue = await result.current.submit('abc', input)
    })

    expect(result.current.status).toBe('error')
    expect(returnValue).toBe('error')
    expect(result.current.errorMessage).toBe('server exploded')
  })

  it('reset returns to idle state', async () => {
    mockUpdateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useUpdateChore())

    await act(async () => {
      await result.current.submit('abc', input)
    })
    expect(result.current.status).toBe('success')

    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
  })

  it('calls updateChore with the given id and input', async () => {
    mockUpdateChore.mockResolvedValueOnce(stubChore)
    const { result } = renderHook(() => useUpdateChore())

    const detailedInput = {
      description: 'Walk dog',
      value_cents: 150,
      is_active: true,
      recurrence_cron: '@daily',
      assignee_ids: ['uuid-1'],
    }
    await act(async () => {
      await result.current.submit('abc', detailedInput)
    })

    expect(mockUpdateChore).toHaveBeenCalledWith('abc', detailedInput)
  })
})
