/// Hook for loading the list of chores (used by the Show Chores page).

import { useEffect, useState } from 'react'
import { listChores } from '../api/chores'
import type { Chore } from '../types/chore'

const PER_PAGE = 100

export interface UseChoresReturn {
  chores: Chore[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  goToNextPage: () => void
  goToPreviousPage: () => void
}

/** Fetches a page of chores, refetching whenever the page changes. */
export function useChores(): UseChoresReturn {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

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

  function goToNextPage() {
    setPage((current) => Math.min(current + 1, totalPages))
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(current - 1, 1))
  }

  return { chores, loading, error, page, totalPages, goToNextPage, goToPreviousPage }
}
