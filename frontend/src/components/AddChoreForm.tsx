/// Form for creating a single-occurrence chore.
/// Manages its own field state; calls onSubmit with validated data.

import { useRef, useState } from 'react'
import type { Person } from '../types/person'
import type { CreateChoreRequest } from '../types/chore'

interface AddChoreFormProps {
  people: Person[]
  onSave: (input: CreateChoreRequest) => void
  disabled: boolean
}

export function AddChoreForm({ people, onSave, disabled }: AddChoreFormProps) {
  const [description, setDescription] = useState('')
  const [valueDollars, setValueDollars] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const descriptionRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!description.trim()) return

    const valueCents =
      valueDollars !== '' ? Math.round(parseFloat(valueDollars) * 100) : undefined

    onSave({
      description: description.trim(),
      value_cents: valueCents,
      due_at: dueAt !== '' ? new Date(dueAt).toISOString() : undefined,
      assignee_ids: selectedIds,
    })
  }

  function toggleAssignee(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="chore-description">Description</label>
        <input
          id="chore-description"
          ref={descriptionRef}
          autoFocus
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="chore-due-at">Due date and time</label>
        <input
          id="chore-due-at"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="chore-value">Value (dollars)</label>
        <input
          id="chore-value"
          type="number"
          min="0"
          step="0.01"
          value={valueDollars}
          onChange={(e) => setValueDollars(e.target.value)}
        />
      </div>

      {people.length > 0 && (
        <fieldset>
          <legend>Assigned to</legend>
          {people.map((person) => (
            <label key={person.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(person.id)}
                onChange={() => toggleAssignee(person.id)}
              />
              {person.name}
            </label>
          ))}
        </fieldset>
      )}

      <button type="submit" disabled={disabled}>
        Save
      </button>
    </form>
  )
}
