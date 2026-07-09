import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { AssigneeIndicator } from '../../src/components/AssigneeIndicator'
import type { Assignee } from '../../src/types/chore'

const alice: Assignee = { id: 'p1', name: 'Alice' }
const bob: Assignee = { id: 'p2', name: 'Bob' }

describe('AssigneeIndicator', () => {
  it('shows 0 in the badge when there are no assignees', () => {
    render(<AssigneeIndicator assignees={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows 1 in the badge for a single assignee', () => {
    render(<AssigneeIndicator assignees={[alice]} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows M in the badge for more than one assignee', () => {
    render(<AssigneeIndicator assignees={[alice, bob]} />)
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('does not show the popup before hovering', () => {
    render(<AssigneeIndicator assignees={[alice]} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows the assignee names as a numbered list on hover', async () => {
    render(<AssigneeIndicator assignees={[alice, bob]} />)

    await userEvent.hover(screen.getByLabelText(/assignees/i))

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('list').tagName).toBe('OL')
    const names = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(names).toEqual(['Alice', 'Bob'])
  })

  it('hides the popup when the pointer leaves', async () => {
    render(<AssigneeIndicator assignees={[alice]} />)
    const indicator = screen.getByLabelText(/assignees/i)

    await userEvent.hover(indicator)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await userEvent.unhover(indicator)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows "No assignees" on hover when there are none', async () => {
    render(<AssigneeIndicator assignees={[]} />)

    await userEvent.hover(screen.getByLabelText(/assignees/i))

    expect(screen.getByRole('tooltip')).toHaveTextContent('No assignees')
  })

  it('shows and hides the popup with keyboard focus', async () => {
    render(<AssigneeIndicator assignees={[alice]} />)

    await userEvent.tab()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await userEvent.tab()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('announces the assignee count to assistive technology', () => {
    render(<AssigneeIndicator assignees={[alice, bob]} />)
    expect(screen.getByLabelText('Assignees: 2')).toBeInTheDocument()
  })
})
