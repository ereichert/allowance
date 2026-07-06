/// Table listing chores with the properties a household cares about, omitting internal record-keeping fields (ID, timestamps).

import type { Chore } from '../types/chore'
import './ChoresTable.css'

interface ChoresTableProps {
  chores: Chore[]
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
          </tr>
        </thead>
        <tbody>
          {chores.length === 0 ? (
            <tr>
              <td className="chores-table__empty" colSpan={4}>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
