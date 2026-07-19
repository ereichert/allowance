import { useEffect, useState } from 'react'
import { useUpdateChore } from '../hooks/useUpdateChore'
import type { ChoreListItem, UpdateChoreRequest } from '../types/chore'
import type { Person } from '../types/person'
import { classifyRecurrence, toCronValue, type RecurrenceKind } from '../utils/recurrence'
import { StatusMessage } from './StatusMessage'
import './ChoreDetailForm.css'

interface ChoreDetailFormProps {
  chore: ChoreListItem
  people: Person[]
  onSaved: () => void
  onDirtyChange: (dirty: boolean) => void
}

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function assigneeIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((id) => bSet.has(id))
}

export function ChoreDetailForm({ chore, people, onSaved, onDirtyChange }: ChoreDetailFormProps) {
  const initialRecurrence = classifyRecurrence(chore.recurrence_cron)
  const [description, setDescription] = useState(chore.description)
  const [valueDollars, setValueDollars] = useState(centsToDollarsInput(chore.value_cents))
  const [isActive, setIsActive] = useState(chore.is_active)
  const [recurrenceKind, setRecurrenceKind] = useState<RecurrenceKind>(initialRecurrence.kind)
  const [customCron, setCustomCron] = useState(initialRecurrence.customCron)
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState(
    chore.assignees.map((assignee) => assignee.id),
  )
  const [savedSnapshot, setSavedSnapshot] = useState({
    description: chore.description,
    valueDollars: centsToDollarsInput(chore.value_cents),
    isActive: chore.is_active,
    recurrenceKind: initialRecurrence.kind,
    customCron: initialRecurrence.customCron,
    assigneeIds: chore.assignees.map((assignee) => assignee.id),
  })
  const { submit, status, errorMessage, reset } = useUpdateChore()

  const isDirty =
    description !== savedSnapshot.description ||
    valueDollars !== savedSnapshot.valueDollars ||
    isActive !== savedSnapshot.isActive ||
    recurrenceKind !== savedSnapshot.recurrenceKind ||
    customCron !== savedSnapshot.customCron ||
    !assigneeIdsEqual(selectedAssigneeIds, savedSnapshot.assigneeIds)

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (isDirty && status === 'success') reset()
  }, [isDirty, status, reset])

  function toggleAssignee(id: string) {
    setSelectedAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) return
    if (recurrenceKind === 'custom' && !customCron.trim()) return

    const input: UpdateChoreRequest = {
      description: description.trim(),
      value_cents: Math.round(parseFloat(valueDollars || '0') * 100),
      is_active: isActive,
      recurrence_cron: toCronValue(recurrenceKind, customCron),
      assignee_ids: selectedAssigneeIds,
    }

    const result = await submit(chore.id, input)
    if (result === 'success') {
      setSavedSnapshot({
        description,
        valueDollars,
        isActive,
        recurrenceKind,
        customCron,
        assigneeIds: selectedAssigneeIds,
      })
      onSaved()
    }
  }

  const statusMessage = status === 'success' ? 'Chore saved successfully.' : errorMessage
  const saveDisabled =
    status === 'loading' ||
    !description.trim() ||
    (recurrenceKind === 'custom' && !customCron.trim())

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

      <div className="chore-detail-form__field">
        <label htmlFor="chore-detail-recurrence">Recurrence</label>
        <select
          id="chore-detail-recurrence"
          value={recurrenceKind}
          onChange={(e) => setRecurrenceKind(e.target.value as RecurrenceKind)}
        >
          <option value="one_time">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {recurrenceKind === 'custom' && (
        <div className="chore-detail-form__field">
          <label htmlFor="chore-detail-custom-cron">Custom cron expression</label>
          <input
            id="chore-detail-custom-cron"
            type="text"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
          />
        </div>
      )}

      {people.length > 0 && (
        <fieldset className="chore-detail-form__assignees">
          <legend>Assigned to</legend>
          <div className="chore-detail-form__assignees-list">
            {people.map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  checked={selectedAssigneeIds.includes(person.id)}
                  onChange={() => toggleAssignee(person.id)}
                />
                {person.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <StatusMessage status={status} message={statusMessage} />

      <div className="chore-detail-form__actions">
        <button className="chore-detail-form__save" type="submit" disabled={saveDisabled}>
          Save
        </button>
      </div>
    </form>
  )
}
