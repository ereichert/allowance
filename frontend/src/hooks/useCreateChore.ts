/// Hook for creating a single-occurrence chore.

import { useState } from 'react'
import { createChore } from '../api/chores'
import type { CreateChoreRequest } from '../types/chore'

type Status = 'idle' | 'loading' | 'success' | 'error'

export interface UseCreateChoreReturn {
  submit: (input: CreateChoreRequest) => Promise<'success' | 'error'>
  status: Status
  errorMessage: string | null
  reset: () => void
}

/** Manages the lifecycle of a create-chore API call. */
export function useCreateChore(): UseCreateChoreReturn {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submit(createChoreRequest: CreateChoreRequest): Promise<'success' | 'error'> {
    setStatus('loading')
    setErrorMessage(null)
    try {
      await createChore(createChoreRequest)
      setStatus('success')
      return 'success'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      console.error('Failed to create chore', { input: createChoreRequest, error: err })
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
