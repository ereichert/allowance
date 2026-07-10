/// Hook for updating a chore.

import { useState } from 'react'
import { updateChore } from '../api/chores'
import type { UpdateChoreRequest } from '../types/chore'

type Status = 'idle' | 'loading' | 'success' | 'error'

export interface UseUpdateChoreReturn {
  submit: (id: string, input: UpdateChoreRequest) => Promise<'success' | 'error'>
  status: Status
  errorMessage: string | null
  reset: () => void
}

/** Manages the lifecycle of an update-chore API call. */
export function useUpdateChore(): UseUpdateChoreReturn {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submit(id: string, input: UpdateChoreRequest): Promise<'success' | 'error'> {
    setStatus('loading')
    setErrorMessage(null)
    try {
      await updateChore(id, input)
      setStatus('success')
      return 'success'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      console.error('Failed to update chore', { id, input, error: err })
      setErrorMessage(message)
      setStatus('error')
      return 'error'
    }
  }

  function reset() {
    setStatus('idle')
    setErrorMessage(null)
  }

  return { submit, status, errorMessage, reset }
}
