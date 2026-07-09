/// Hook for loading a page of chores (used by the Show Chores page). The
/// current page is owned by the caller (synced to the URL), not this hook.

import { useEffect, useState } from 'react'
import { listChores } from '../api/chores'
import type { ChoreListItem } from '../types/chore'

const PER_PAGE = 100

export interface UseChoresReturn {
  chores: ChoreListItem[]
  loading: boolean
  error: string | null
  totalPages: number
}

/** Fetches a page of chores, refetching whenever `page` changes. */
export function useChores(page: number): UseChoresReturn {
  const [chores, setChores] = useState<ChoreListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [fetchedPage, setFetchedPage] = useState(page)

  if (page !== fetchedPage) {
    setFetchedPage(page)
    setLoading(true)
  }

  useEffect(() => {
    listChores(page, PER_PAGE)
      .then((data) => {
        setChores(data.items)
        setTotal(data.total)
        setError(null)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load chores'
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return { chores, loading, error, totalPages }
}
