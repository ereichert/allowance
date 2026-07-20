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

describe('ChoreDetailForm recurrence field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
