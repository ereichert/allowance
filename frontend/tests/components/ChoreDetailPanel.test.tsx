import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ChoreDetailPanel } from '../../src/components/ChoreDetailPanel'
import type { ChoreListItem } from '../../src/types/chore'

const baseChore: ChoreListItem = {
  id: 'c1',
  description: 'Take out trash',
  value_cents: 150,
  recurrence_cron: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T08:30:00Z',
  assignees: [],
}

function renderPanel(chore: ChoreListItem | null, overrides: { onClose?: () => void } = {}) {
  return render(
    <ChoreDetailPanel
      chore={chore}
      onClose={overrides.onClose ?? vi.fn()}
      onSaved={vi.fn()}
      onDirtyChange={vi.fn()}
    />,
  )
}

describe('ChoreDetailPanel', () => {
  it('renders nothing when chore is null', () => {
    renderPanel(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an accessible dialog labeled "Chore details" when a chore is given', () => {
    renderPanel(baseChore)
    expect(screen.getByRole('dialog', { name: 'Chore details' })).toBeInTheDocument()
  })

  it('renders "Chore details" as the heading', () => {
    renderPanel(baseChore)
    expect(screen.getByRole('heading', { name: 'Chore details' })).toBeInTheDocument()
  })

  it('pre-fills the description field with the chore description', () => {
    renderPanel(baseChore)
    expect(screen.getByLabelText(/description/i)).toHaveValue('Take out trash')
  })

  it('pre-fills the value field with the chore value in dollars', () => {
    renderPanel(baseChore)
    expect(screen.getByLabelText(/value/i)).toHaveValue(1.5)
  })

  it('shows "One-time" when recurrence_cron is null', () => {
    renderPanel(baseChore)
    expect(screen.getByText('One-time')).toBeInTheDocument()
  })

  it('shows the raw recurrence cron string when present', () => {
    renderPanel({ ...baseChore, recurrence_cron: '@daily' })
    expect(screen.getByText('@daily')).toBeInTheDocument()
  })

  it('pre-fills the status field as Active when the chore is active', () => {
    renderPanel(baseChore)
    expect(screen.getByLabelText(/status/i)).toHaveValue('active')
  })

  it('pre-fills the status field as Inactive when the chore is not active', () => {
    renderPanel({ ...baseChore, is_active: false })
    expect(screen.getByLabelText(/status/i)).toHaveValue('inactive')
  })

  it('shows "No assignees" when there are none', () => {
    renderPanel(baseChore)
    expect(screen.getByText('No assignees')).toBeInTheDocument()
  })

  it('lists assignee names when present', () => {
    const chore = {
      ...baseChore,
      assignees: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
    }
    renderPanel(chore)
    const names = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(names).toEqual(['Alice', 'Bob'])
  })

  it('renders the chore id', () => {
    renderPanel(baseChore)
    expect(screen.getByText('c1')).toBeInTheDocument()
  })

  it('renders formatted created_at and updated_at timestamps', () => {
    renderPanel(baseChore)
    expect(screen.getByText('2026-01-01 00:00 UTC')).toBeInTheDocument()
    expect(screen.getByText('2026-01-02 08:30 UTC')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    renderPanel(baseChore, { onClose })

    await userEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed while open', async () => {
    const onClose = vi.fn()
    renderPanel(baseChore, { onClose })

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('resets form fields to the new chore when switching chores without closing', () => {
    const otherChore: ChoreListItem = {
      id: 'c2',
      description: 'Wash dishes',
      value_cents: 300,
      recurrence_cron: null,
      is_active: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T08:30:00Z',
      assignees: [],
    }
    const { rerender } = render(
      <ChoreDetailPanel chore={baseChore} onClose={vi.fn()} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    rerender(
      <ChoreDetailPanel chore={otherChore} onClose={vi.fn()} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    expect(screen.getByLabelText(/description/i)).toHaveValue('Wash dishes')
    expect(screen.getByLabelText(/value/i)).toHaveValue(3)
    expect(screen.getByLabelText(/status/i)).toHaveValue('inactive')
  })

  it('does not call onClose on Escape after the panel has already closed', async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <ChoreDetailPanel chore={baseChore} onClose={onClose} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )

    rerender(
      <ChoreDetailPanel chore={null} onClose={onClose} onSaved={vi.fn()} onDirtyChange={vi.fn()} />,
    )
    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })
})
