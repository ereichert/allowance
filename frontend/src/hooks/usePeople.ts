/// Hook for loading the list of people (used to populate the assignee picker).

import { useEffect, useState } from 'react'
import { listPeople } from '../api/chores'
import type { Person } from '../types/person'

export interface UsePeopleReturn {
  people: Person[]
  loading: boolean
  error: string | null
}

/** Fetches the list of people on mount. */
export function usePeople(): UsePeopleReturn {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPeople()
      .then((data) => {
        setPeople(data)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load people'
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { people, loading, error }
}
