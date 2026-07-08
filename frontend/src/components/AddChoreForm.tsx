/// Form for creating a single-occurrence chore.
/// Manages its own field state; calls onSubmit with validated data.

import { useRef, useState } from 'react'
import type { Person } from '../types/person'
import type { CreateChoreRequest } from '../types/chore'
import './AddChoreForm.css'

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
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!description.trim()) return

    const valueCents = valueDollars !== '' ? Math.round(parseFloat(valueDollars) * 100) : undefined

    onSave({
      description: description.trim(),
      value_cents: valueCents,
      due_at: dueAt !== '' ? new Date(dueAt).toISOString() : undefined,
      assignee_ids: selectedIds,
    })
  }

  function toggleAssignee(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <form className="add-chore-form" onSubmit={handleSubmit}>
      <div className="add-chore-form__field">
        <label htmlFor="chore-description">Description</label>
        <textarea
          id="chore-description"
          ref={descriptionRef}
          autoFocus
          className="add-chore-form__description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="add-chore-form__field">
        <label htmlFor="chore-due-at">Due date and time</label>
        <input
          id="chore-due-at"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>

      <div className="add-chore-form__field">
        <label htmlFor="chore-value">Value (dollars)</label>
        <input
          id="chore-value"
          type="number"
          min="0"
          step="0.01"
          value={valueDollars}
          onChange={(e) => setValueDollars(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {people.length > 0 && (
        <fieldset className="add-chore-form__assignees">
          <legend>Assigned to</legend>
          <div className="add-chore-form__assignees-list">
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
          </div>
        </fieldset>
      )}

      <div className="add-chore-form__actions">
        <button className="add-chore-form__submit" type="submit" disabled={disabled}>
          Save
        </button>
      </div>
    </form>
  )
}
