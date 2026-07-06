/// Hook for loading the list of chores (used by the Show Chores page).

import { useEffect, useState } from 'react'
import { listChores } from '../api/chores'
import type { Chore } from '../types/chore'

export interface UseChoresReturn {
  chores: Chore[]
  loading: boolean
  error: string | null
}

/** Fetches the list of chores on mount. */
export function useChores(): UseChoresReturn {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listChores()
      .then((data) => {
        setChores(data)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load chores'
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { chores, loading, error }
}
