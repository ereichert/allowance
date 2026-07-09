/// Table listing chores with the properties a household cares about, omitting internal record-keeping fields (ID, timestamps).

import type { ChoreListItem } from '../types/chore'
import { formatValue } from '../utils/currency'
import { AssigneeIndicator } from './AssigneeIndicator'
import './ChoresTable.css'

interface ChoresTableProps {
  chores: ChoreListItem[]
  onRowClick: (chore: ChoreListItem) => void
}

export function ChoresTable({ chores, onRowClick }: ChoresTableProps) {
  return (
    <div className="chores-table__scroll">
      <table className="chores-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Value</th>
            <th>Recurrence</th>
            <th>Active</th>
            <th>Assignees</th>
          </tr>
        </thead>
        <tbody>
          {chores.length === 0 ? (
            <tr>
              <td className="chores-table__empty" colSpan={5}>
                No chores yet.
              </td>
            </tr>
          ) : (
            chores.map((chore) => (
              <tr
                key={chore.id}
                className="chores-table__row--clickable"
                tabIndex={0}
                onClick={() => onRowClick(chore)}
                onKeyDown={(event) => {
                  // AssigneeIndicator nests its own focusable badge inside the
                  // row; only treat Enter/Space as "open this row" when the
                  // row itself — not a descendant — is the focused target.
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRowClick(chore)
                  }
                }}
              >
                <td>{chore.description}</td>
                <td>{formatValue(chore.value_cents)}</td>
                <td>{chore.recurrence_cron ?? 'One-time'}</td>
                <td>{chore.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <AssigneeIndicator assignees={chore.assignees} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
