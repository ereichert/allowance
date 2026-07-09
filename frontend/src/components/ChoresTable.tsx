/// Table listing chores with the properties a household cares about, omitting internal record-keeping fields (ID, timestamps).

import type { ChoreListItem } from '../types/chore'
import { AssigneeIndicator } from './AssigneeIndicator'
import './ChoresTable.css'

interface ChoresTableProps {
  chores: ChoreListItem[]
}

function formatValue(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function ChoresTable({ chores }: ChoresTableProps) {
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
              <tr key={chore.id}>
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
