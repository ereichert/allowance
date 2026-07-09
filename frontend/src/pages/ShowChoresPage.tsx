/// Page for browsing all chores.
/// Composes useChores + ChoresTable. The current page lives in the URL.

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChoreDetailPanel } from '../components/ChoreDetailPanel'
import { ChoresTable } from '../components/ChoresTable'
import { StatusMessage } from '../components/StatusMessage'
import { useChores } from '../hooks/useChores'
import type { ChoreListItem } from '../types/chore'
import { parsePageParam } from '../utils/pagination'
import './ShowChoresPage.css'

export function ShowChoresPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePageParam(searchParams.get('page'))
  const { chores, loading, error, totalPages } = useChores(page)
  const [selectedChoreId, setSelectedChoreId] = useState<string | null>(null)
  const selectedChore = chores.find((chore) => chore.id === selectedChoreId) ?? null

  const isInvalidPage = !loading && !error && page > totalPages

  useEffect(() => {
    if (isInvalidPage) {
      setSearchParams({}, { replace: true })
    }
  }, [isInvalidPage, setSearchParams])

  function goToPage(nextPage: number) {
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {})
  }

  function handleRowClick(chore: ChoreListItem) {
    setSelectedChoreId(chore.id)
  }

  function renderBody() {
    if (loading || isInvalidPage) return <p>Loading chores…</p>
    if (error) return null

    return (
      <>
        <ChoresTable chores={chores} onRowClick={handleRowClick} />
        <div className="show-chores-page__pagination">
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="show-chores-page">
      <StatusMessage status={error ? 'error' : 'idle'} message={error} />
      {renderBody()}
      <ChoreDetailPanel chore={selectedChore} onClose={() => setSelectedChoreId(null)} />
    </div>
  )
}
