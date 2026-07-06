/// Page for browsing all chores.
/// Composes useChores + ChoresTable.

import { ChoresTable } from '../components/ChoresTable'
import { StatusMessage } from '../components/StatusMessage'
import { useChores } from '../hooks/useChores'
import './ShowChoresPage.css'

export function ShowChoresPage() {
  const { chores, loading, error } = useChores()

  return (
    <div className="show-chores-page">
      <StatusMessage status={error ? 'error' : 'idle'} message={error} />
      {loading ? <p>Loading chores…</p> : <ChoresTable chores={chores} />}
    </div>
  )
}
