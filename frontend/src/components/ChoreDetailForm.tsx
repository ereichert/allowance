import { useEffect, useState } from 'react'
import { useUpdateChore } from '../hooks/useUpdateChore'
import type { ChoreListItem, UpdateChoreRequest } from '../types/chore'
import { StatusMessage } from './StatusMessage'
import './ChoreDetailForm.css'

interface ChoreDetailFormProps {
  chore: ChoreListItem
  onSaved: () => void
  onDirtyChange: (dirty: boolean) => void
}

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function ChoreDetailForm({ chore, onSaved, onDirtyChange }: ChoreDetailFormProps) {
  const [description, setDescription] = useState(chore.description)
  const [valueDollars, setValueDollars] = useState(centsToDollarsInput(chore.value_cents))
  const [isActive, setIsActive] = useState(chore.is_active)
  const [savedSnapshot, setSavedSnapshot] = useState({
    description: chore.description,
    valueDollars: centsToDollarsInput(chore.value_cents),
    isActive: chore.is_active,
  })
  const { submit, status, errorMessage, reset } = useUpdateChore()

  const isDirty =
    description !== savedSnapshot.description ||
    valueDollars !== savedSnapshot.valueDollars ||
    isActive !== savedSnapshot.isActive

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (isDirty && status === 'success') reset()
  }, [isDirty, status, reset])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) return

    const input: UpdateChoreRequest = {
      description: description.trim(),
      value_cents: Math.round(parseFloat(valueDollars || '0') * 100),
      is_active: isActive,
      recurrence_cron: chore.recurrence_cron,
      assignee_ids: chore.assignees.map((assignee) => assignee.id),
    }

    const result = await submit(chore.id, input)
    if (result === 'success') {
      setSavedSnapshot({ description, valueDollars, isActive })
      onSaved()
    }
  }

  const statusMessage = status === 'success' ? 'Chore saved successfully.' : errorMessage

  return (
    <form className="chore-detail-form" onSubmit={handleSubmit}>
      <div className="chore-detail-form__field">
        <label htmlFor="chore-detail-description">Description</label>
        <textarea
          id="chore-detail-description"
          className="chore-detail-form__description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="chore-detail-form__field">
        <label htmlFor="chore-detail-status">Status</label>
        <select
          id="chore-detail-status"
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="chore-detail-form__field">
        <label htmlFor="chore-detail-value">Value (dollars)</label>
        <input
          id="chore-detail-value"
          type="number"
          min="0"
          step="0.01"
          value={valueDollars}
          onChange={(e) => setValueDollars(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      <StatusMessage status={status} message={statusMessage} />

      <div className="chore-detail-form__actions">
        <button
          className="chore-detail-form__save"
          type="submit"
          disabled={status === 'loading' || !description.trim()}
        >
          Save
        </button>
      </div>
    </form>
  )
}
