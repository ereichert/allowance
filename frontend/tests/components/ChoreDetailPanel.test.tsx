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

describe('ChoreDetailPanel', () => {
  it('renders nothing when chore is null', () => {
    render(<ChoreDetailPanel chore={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an accessible dialog labeled "Chore details" when a chore is given', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Chore details' })).toBeInTheDocument()
  })

  it('renders the chore description as the heading', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Take out trash' })).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByText('$1.50')).toBeInTheDocument()
  })

  it('shows "One-time" when recurrence_cron is null', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByText('One-time')).toBeInTheDocument()
  })

  it('shows the raw recurrence cron string when present', () => {
    render(
      <ChoreDetailPanel chore={{ ...baseChore, recurrence_cron: '@daily' }} onClose={vi.fn()} />,
    )
    expect(screen.getByText('@daily')).toBeInTheDocument()
  })

  it('shows Active when the chore is active', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Inactive when the chore is not active', () => {
    render(<ChoreDetailPanel chore={{ ...baseChore, is_active: false }} onClose={vi.fn()} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows "No assignees" when there are none', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
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
    render(<ChoreDetailPanel chore={chore} onClose={vi.fn()} />)
    const names = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(names).toEqual(['Alice', 'Bob'])
  })

  it('renders the chore id', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByText('c1')).toBeInTheDocument()
  })

  it('renders formatted created_at and updated_at timestamps', () => {
    render(<ChoreDetailPanel chore={baseChore} onClose={vi.fn()} />)
    expect(screen.getByText('2026-01-01 00:00 UTC')).toBeInTheDocument()
    expect(screen.getByText('2026-01-02 08:30 UTC')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<ChoreDetailPanel chore={baseChore} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed while open', async () => {
    const onClose = vi.fn()
    render(<ChoreDetailPanel chore={baseChore} onClose={onClose} />)

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on Escape after the panel has already closed', async () => {
    const onClose = vi.fn()
    const { rerender } = render(<ChoreDetailPanel chore={baseChore} onClose={onClose} />)

    rerender(<ChoreDetailPanel chore={null} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })
})
