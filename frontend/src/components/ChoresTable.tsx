/// Table listing every chore, one column per property.

import type { Chore } from '../types/chore'
import './ChoresTable.css'

interface ChoresTableProps {
  chores: Chore[]
}

function formatValue(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function ChoresTable({ chores }: ChoresTableProps) {
  return (
    <div className="chores-table__scroll">
      <table className="chores-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Description</th>
            <th>Value</th>
            <th>Recurrence</th>
            <th>Active</th>
            <th>Created At</th>
            <th>Updated At</th>
          </tr>
        </thead>
        <tbody>
          {chores.length === 0 ? (
            <tr>
              <td className="chores-table__empty" colSpan={7}>
                No chores yet.
              </td>
            </tr>
          ) : (
            chores.map((chore) => (
              <tr key={chore.id}>
                <td className="chores-table__id">{chore.id}</td>
                <td>{chore.description}</td>
                <td>{formatValue(chore.value_cents)}</td>
                <td>{chore.recurrence_cron ?? 'One-time'}</td>
                <td>{chore.is_active ? 'Active' : 'Inactive'}</td>
                <td>{formatDate(chore.created_at)}</td>
                <td>{formatDate(chore.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
