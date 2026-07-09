import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
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

const noop = () => {}

describe('ChoresTable', () => {
  it('renders a row per chore', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
    expect(screen.getByText('Wash dishes')).toBeInTheDocument()
  })

  it('renders a column header for each chore property', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    for (const name of ['Description', 'Value', 'Recurrence', 'Active', 'Assignees']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
  })

  it('renders an assignee indicator for each chore', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getAllByLabelText(/assignees/i)).toHaveLength(2)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('formats value_cents as currency', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByText('$1.50')).toBeInTheDocument()
    expect(screen.getByText('$2.00')).toBeInTheDocument()
  })

  it('shows "One-time" when recurrence_cron is null', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByText('One-time')).toBeInTheDocument()
  })

  it('shows the raw recurrence cron string when present', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByText('@daily')).toBeInTheDocument()
  })

  it('shows Active and Inactive status text', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByRole('cell', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Inactive' })).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no chores', () => {
    render(<ChoresTable chores={[]} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByText(/no chores/i)).toBeInTheDocument()
  })

  it('does not expose the ID, Created At, or Updated At columns', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    for (const name of ['ID', 'Created At', 'Updated At']) {
      expect(screen.queryByRole('columnheader', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByText('c1')).not.toBeInTheDocument()
  })

  it('calls onRowClick with the clicked chore', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)

    await userEvent.click(screen.getByRole('row', { name: /take out trash/i }))

    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).toHaveBeenCalledWith(stubChores[0])
  })

  it('calls onRowClick with the corresponding chore for a different row', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)

    await userEvent.click(screen.getByRole('row', { name: /wash dishes/i }))

    expect(onRowClick).toHaveBeenCalledWith(stubChores[1])
  })

  it('marks chore rows as clickable for styling', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByRole('row', { name: /take out trash/i })).toHaveClass(
      'chores-table__row--clickable',
    )
  })

  it('puts chore rows in the tab order', () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    expect(screen.getByRole('row', { name: /take out trash/i })).toHaveAttribute('tabindex', '0')
  })

  it('calls onRowClick when Enter is pressed on a focused row', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard('{Enter}')

    expect(onRowClick).toHaveBeenCalledWith(stubChores[0])
  })

  it('calls onRowClick when Space is pressed on a focused row', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard(' ')

    expect(onRowClick).toHaveBeenCalledWith(stubChores[0])
  })

  it('does not call onRowClick when an unrelated key is pressed on a focused row', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard('a')

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('does not call onRowClick when Enter is pressed on the nested assignee indicator', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)

    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getAllByLabelText(/assignees/i)[0]).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('moves focus to the next row when Down is pressed', async () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard('{ArrowDown}')

    expect(screen.getByRole('row', { name: /wash dishes/i })).toHaveFocus()
  })

  it('moves focus to the previous row when Up is pressed', async () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /wash dishes/i }).focus()

    await userEvent.keyboard('{ArrowUp}')

    expect(screen.getByRole('row', { name: /take out trash/i })).toHaveFocus()
  })

  it('keeps focus on the last row when Down is pressed', async () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    const lastRow = screen.getByRole('row', { name: /wash dishes/i })
    lastRow.focus()

    await userEvent.keyboard('{ArrowDown}')

    expect(lastRow).toHaveFocus()
  })

  it('keeps focus on the first row when Up is pressed', async () => {
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={noop} />)
    const firstRow = screen.getByRole('row', { name: /take out trash/i })
    firstRow.focus()

    await userEvent.keyboard('{ArrowUp}')

    expect(firstRow).toHaveFocus()
  })

  it('calls onRowClick when Right is pressed on a focused row', async () => {
    const onRowClick = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={noop} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard('{ArrowRight}')

    expect(onRowClick).toHaveBeenCalledWith(stubChores[0])
  })

  it('calls onCloseDetail when Left is pressed on a focused row', async () => {
    const onCloseDetail = vi.fn()
    render(<ChoresTable chores={stubChores} onRowClick={noop} onCloseDetail={onCloseDetail} />)
    screen.getByRole('row', { name: /take out trash/i }).focus()

    await userEvent.keyboard('{ArrowLeft}')

    expect(onCloseDetail).toHaveBeenCalledTimes(1)
  })

  it('does not call onRowClick or onCloseDetail when an arrow key is pressed on the nested assignee indicator', async () => {
    const onRowClick = vi.fn()
    const onCloseDetail = vi.fn()
    render(
      <ChoresTable chores={stubChores} onRowClick={onRowClick} onCloseDetail={onCloseDetail} />,
    )

    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getAllByLabelText(/assignees/i)[0]).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}{ArrowLeft}{ArrowUp}{ArrowDown}')

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onCloseDetail).not.toHaveBeenCalled()
  })
})
