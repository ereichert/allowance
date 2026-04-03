import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { AddChoreForm } from '../../src/components/AddChoreForm'
import type { Person } from '../../src/types/person'

const noPeople: Person[] = []
const twoPeople: Person[] = [
  { id: 'p1', name: 'Alice', role: 'Child', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob', role: 'Admin', created_at: '2026-01-01T00:00:00Z' },
]

describe('AddChoreForm', () => {
  it('renders description, due-date, value, and save fields', () => {
    render(<AddChoreForm people={noPeople} onSave={vi.fn()} disabled={false} />)
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('autofocuses the description input', () => {
    render(<AddChoreForm people={noPeople} onSave={vi.fn()} disabled={false} />)
    expect(screen.getByLabelText(/description/i)).toHaveFocus()
  })

  it('renders a checkbox for each person', () => {
    render(<AddChoreForm people={twoPeople} onSave={vi.fn()} disabled={false} />)
    expect(screen.getByLabelText('Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Bob')).toBeInTheDocument()
  })

  it('calls onSave with description and no optional fields when only description filled', async () => {
    const onSave = vi.fn()
    render(<AddChoreForm people={noPeople} onSave={onSave} disabled={false} />)

    await userEvent.type(screen.getByLabelText(/description/i), 'Take out trash')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith({
      description: 'Take out trash',
      value_cents: undefined,
      due_at: undefined,
      assignee_ids: [],
    })
  })

  it('converts dollar value to cents on submit', async () => {
    const onSave = vi.fn()
    render(<AddChoreForm people={noPeople} onSave={onSave} disabled={false} />)

    await userEvent.type(screen.getByLabelText(/description/i), 'Mow lawn')
    await userEvent.type(screen.getByLabelText(/value/i), '2.50')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ value_cents: 250 }),
    )
  })

  it('includes selected assignee ids on submit', async () => {
    const onSave = vi.fn()
    render(<AddChoreForm people={twoPeople} onSave={onSave} disabled={false} />)

    await userEvent.type(screen.getByLabelText(/description/i), 'Sweep')
    await userEvent.click(screen.getByLabelText('Alice'))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ assignee_ids: ['p1'] }),
    )
  })

  it('does not call onSave when description is blank', async () => {
    const onSave = vi.fn()
    render(<AddChoreForm people={noPeople} onSave={onSave} disabled={false} />)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables the save button when disabled prop is true', () => {
    render(<AddChoreForm people={noPeople} onSave={vi.fn()} disabled={true} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
})
