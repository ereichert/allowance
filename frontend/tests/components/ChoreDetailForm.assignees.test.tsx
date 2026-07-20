import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ChoreDetailForm } from '../../src/components/ChoreDetailForm'
import * as choreApi from '../../src/api/chores'
import type { ChoreListItem } from '../../src/types/chore'
import type { Person } from '../../src/types/person'

vi.mock('../../src/api/chores')

const mockUpdateChore = vi.mocked(choreApi.updateChore)

const baseChore: ChoreListItem = {
  id: 'c1',
  description: 'Take out trash',
  value_cents: 150,
  recurrence_cron: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T08:30:00Z',
  assignees: [{ id: 'p1', name: 'Alice' }],
}

const twoPeople: Person[] = [
  { id: 'p1', name: 'Alice', role: 'Child', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob', role: 'Admin', created_at: '2026-01-01T00:00:00Z' },
]

describe('ChoreDetailForm assignees field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("pre-checks assignee checkboxes matching the chore's current assignees", () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    expect(screen.getByLabelText('Alice')).toBeChecked()
    expect(screen.getByLabelText('Bob')).not.toBeChecked()
  })

  it('reports dirty after toggling an assignee checkbox', async () => {
    const onDirtyChange = vi.fn()
    render(
      <ChoreDetailForm
        chore={baseChore}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    onDirtyChange.mockClear()

    await userEvent.click(screen.getByLabelText('Bob'))

    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })

  it('does not render the assignees fieldset when there are no people', () => {
    render(<ChoreDetailForm chore={baseChore} people={[]} onSaved={vi.fn()} onDirtyChange={vi.fn()} />)

    expect(screen.queryByLabelText('Alice')).not.toBeInTheDocument()
  })

  it('calls updateChore with the edited fields, recurrence, and assignees', async () => {
    mockUpdateChore.mockResolvedValueOnce(baseChore)
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.clear(screen.getByLabelText(/description/i))
    await userEvent.type(screen.getByLabelText(/description/i), 'Sweep porch')
    await userEvent.clear(screen.getByLabelText(/value/i))
    await userEvent.type(screen.getByLabelText(/value/i), '3.25')
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive')
    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'weekly')
    await userEvent.click(screen.getByLabelText('Bob'))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(mockUpdateChore).toHaveBeenCalledWith('c1', {
      description: 'Sweep porch',
      value_cents: 325,
      is_active: false,
      recurrence_cron: '@weekly',
      assignee_ids: ['p1', 'p2'],
    })
  })
})
