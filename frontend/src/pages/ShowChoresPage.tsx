/// Page for browsing all chores.
/// Composes useChores + ChoresTable.

import { ChoresTable } from '../components/ChoresTable'
import { StatusMessage } from '../components/StatusMessage'
import { useChores } from '../hooks/useChores'
import './ShowChoresPage.css'

export function ShowChoresPage() {
  const { chores, loading, error, page, totalPages, goToNextPage, goToPreviousPage } = useChores()

  return (
    <div className="show-chores-page">
      <StatusMessage status={error ? 'error' : 'idle'} message={error} />
      {loading ? (
        <p>Loading chores…</p>
      ) : (
        <>
          <ChoresTable chores={chores} />
          <div className="show-chores-page__pagination">
            <button type="button" onClick={goToPreviousPage} disabled={page <= 1}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button type="button" onClick={goToNextPage} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
