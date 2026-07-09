import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChoresTable } from '../../src/components/ChoresTable'
import type { ChoreListItem } from '../../src/types/chore'

const stubChores: ChoreListItem[] = [
  {
    id: 'c1',
    description: 'Take out trash',
    value_cents: 150,
    recurrence_cron: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    assignees: [],
  },
  {
    id: 'c2',
    description: 'Wash dishes',
    value_cents: 200,
    recurrence_cron: '@daily',
    is_active: false,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
    assignees: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
  },
]

describe('ChoresTable', () => {
  it('renders a row per chore', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
    expect(screen.getByText('Wash dishes')).toBeInTheDocument()
  })

  it('renders a column header for each chore property', () => {
    render(<ChoresTable chores={stubChores} />)
    for (const name of ['Description', 'Value', 'Recurrence', 'Active', 'Assignees']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
  })

  it('renders an assignee indicator for each chore', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getAllByLabelText(/assignees/i)).toHaveLength(2)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('formats value_cents as currency', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getByText('$1.50')).toBeInTheDocument()
    expect(screen.getByText('$2.00')).toBeInTheDocument()
  })

  it('shows "One-time" when recurrence_cron is null', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getByText('One-time')).toBeInTheDocument()
  })

  it('shows the raw recurrence cron string when present', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getByText('@daily')).toBeInTheDocument()
  })

  it('shows Active and Inactive status text', () => {
    render(<ChoresTable chores={stubChores} />)
    expect(screen.getByRole('cell', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Inactive' })).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no chores', () => {
    render(<ChoresTable chores={[]} />)
    expect(screen.getByText(/no chores/i)).toBeInTheDocument()
  })

  it('does not expose the ID, Created At, or Updated At columns', () => {
    render(<ChoresTable chores={stubChores} />)
    for (const name of ['ID', 'Created At', 'Updated At']) {
      expect(screen.queryByRole('columnheader', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByText('c1')).not.toBeInTheDocument()
  })
})
