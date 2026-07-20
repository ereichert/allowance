/// Side panel showing the full details of a selected chore. Renders nothing
/// when no chore is selected; closes via its close button or the Escape key.

import { useEffect } from 'react'
import { usePeople } from '../hooks/usePeople'
import type { ChoreListItem } from '../types/chore'
import { formatTimestamp } from '../utils/datetime'
import { ChoreDetailForm } from './ChoreDetailForm'
import './ChoreDetailPanel.css'

interface ChoreDetailPanelProps {
  chore: ChoreListItem | null
  onClose: () => void
  onSaved: () => void
  onDirtyChange: (dirty: boolean) => void
}

export function ChoreDetailPanel({
  chore,
  onClose,
  onSaved,
  onDirtyChange,
}: ChoreDetailPanelProps) {
  const { people } = usePeople()

  useEffect(() => {
    if (!chore) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [chore, onClose])

  if (!chore) return null

  return (
    <aside className="chore-detail-panel" role="dialog" aria-label="Chore details">
      <button
        type="button"
        className="chore-detail-panel__close"
        aria-label="Close chore details"
        onClick={onClose}
      >
        &times;
      </button>
      <h2 className="chore-detail-panel__title">Chore details</h2>

      <ChoreDetailForm
        key={chore.id}
        chore={chore}
        people={people}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
      />

      <dl className="chore-detail-panel__fields">
        <dt>Created</dt>
        <dd>{formatTimestamp(chore.created_at)}</dd>

        <dt>Last updated</dt>
        <dd>{formatTimestamp(chore.updated_at)}</dd>

        <dt>ID</dt>
        <dd>{chore.id}</dd>
      </dl>
    </aside>
  )
}
