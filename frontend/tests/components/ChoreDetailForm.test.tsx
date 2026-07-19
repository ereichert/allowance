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

describe('ChoreDetailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pre-fills the description, status, and value fields from the chore', () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    expect(screen.getByLabelText(/description/i)).toHaveValue('Take out trash')
    expect(screen.getByLabelText(/status/i)).toHaveValue('active')
    expect(screen.getByLabelText(/value/i)).toHaveValue(1.5)
  })

  it('pre-fills the status field as Inactive when the chore is not active', () => {
    render(
      <ChoreDetailForm
        chore={{ ...baseChore, is_active: false }}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/status/i)).toHaveValue('inactive')
  })

  it('updates the description field on input', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    const field = screen.getByLabelText(/description/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'Sweep porch')

    expect(field).toHaveValue('Sweep porch')
  })

  it('updates the value field on input', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    const field = screen.getByLabelText(/value/i)
    await userEvent.clear(field)
    await userEvent.type(field, '3.25')

    expect(field).toHaveValue(3.25)
  })

  it('updates the status field on selection', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive')

    expect(screen.getByLabelText(/status/i)).toHaveValue('inactive')
  })

  it('reports dirty after a field is edited', async () => {
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

    await userEvent.type(screen.getByLabelText(/description/i), ' more')

    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })

  it('reports not dirty again after a successful save', async () => {
    mockUpdateChore.mockResolvedValueOnce({ ...baseChore, description: 'Take out trash more' })
    const onDirtyChange = vi.fn()
    render(
      <ChoreDetailForm
        chore={baseChore}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    await userEvent.type(screen.getByLabelText(/description/i), ' more')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('calls onSaved after a successful save', async () => {
    mockUpdateChore.mockResolvedValueOnce(baseChore)
    const onSaved = vi.fn()
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={onSaved} onDirtyChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('disables the save button when the description is blank', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.clear(screen.getByLabelText(/description/i))

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('does not call onSaved when updateChore rejects', async () => {
    mockUpdateChore.mockRejectedValueOnce(new Error('server exploded'))
    const onSaved = vi.fn()
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={onSaved} onDirtyChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows the error message from a rejected save', async () => {
    mockUpdateChore.mockRejectedValueOnce(new Error('server exploded'))
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('server exploded')
  })

  it('clears the saved-successfully message after editing a field again', async () => {
    mockUpdateChore.mockResolvedValueOnce(baseChore)
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('Chore saved successfully.')

    await userEvent.type(screen.getByLabelText(/description/i), ' again')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('pre-fills the recurrence field as One-time when recurrence_cron is null', () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    expect(screen.getByLabelText(/recurrence/i)).toHaveValue('one_time')
  })

  it('pre-fills the recurrence field with the matching canonical kind', () => {
    render(
      <ChoreDetailForm
        chore={{ ...baseChore, recurrence_cron: '@daily' }}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/recurrence/i)).toHaveValue('daily')
  })

  it('pre-fills the recurrence field as Custom and shows the custom cron input for a non-canonical cron string', () => {
    render(
      <ChoreDetailForm
        chore={{ ...baseChore, recurrence_cron: '0 9 * * 1-5' }}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/recurrence/i)).toHaveValue('custom')
    expect(screen.getByLabelText(/custom cron/i)).toHaveValue('0 9 * * 1-5')
  })

  it('does not show the custom cron input for a canonical recurrence kind', () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    expect(screen.queryByLabelText(/custom cron/i)).not.toBeInTheDocument()
  })

  it('shows the custom cron input when Custom is selected', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'custom')

    expect(screen.getByLabelText(/custom cron/i)).toBeInTheDocument()
  })

  it('hides the custom cron input again when switching away from Custom', async () => {
    render(
      <ChoreDetailForm
        chore={{ ...baseChore, recurrence_cron: '0 9 * * 1-5' }}
        people={twoPeople}
        onSaved={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'weekly')

    expect(screen.queryByLabelText(/custom cron/i)).not.toBeInTheDocument()
  })

  it('reports dirty after changing the recurrence field', async () => {
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

    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'weekly')

    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })

  it('disables save when Custom recurrence is selected and the custom cron field is blank', async () => {
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'custom')

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('pre-checks assignee checkboxes matching the chore\'s current assignees', () => {
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

  it('sends the trimmed custom cron expression when Custom recurrence is used', async () => {
    mockUpdateChore.mockResolvedValueOnce(baseChore)
    render(
      <ChoreDetailForm chore={baseChore} people={twoPeople} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    await userEvent.selectOptions(screen.getByLabelText(/recurrence/i), 'custom')
    await userEvent.type(screen.getByLabelText(/custom cron/i), '  0 9 * * 1-5  ')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(mockUpdateChore).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ recurrence_cron: '0 9 * * 1-5' }),
    )
  })
})
