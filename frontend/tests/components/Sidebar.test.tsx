import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '../../src/components/Sidebar'

describe('Sidebar', () => {
  let onNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onNavigate = vi.fn()
  })

  it('renders a navigation landmark', () => {
    render(<Sidebar onNavigate={onNavigate} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders the app name', () => {
    render(<Sidebar onNavigate={onNavigate} />)
    expect(screen.getByText('Allowance')).toBeInTheDocument()
  })

  it('renders an Add Chore nav item', () => {
    render(<Sidebar onNavigate={onNavigate} />)
    expect(screen.getByRole('link', { name: /add chore/i })).toBeInTheDocument()
  })

  it('marks the Add Chore link as current when activeItem is add-chore', () => {
    render(<Sidebar activeItem="add-chore" onNavigate={onNavigate} />)
    expect(screen.getByRole('link', { name: /add chore/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not mark any link as current when no activeItem is set', () => {
    render(<Sidebar onNavigate={onNavigate} />)
    expect(screen.getByRole('link', { name: /add chore/i })).not.toHaveAttribute('aria-current')
  })

  it('renders a Show Chores nav item', () => {
    render(<Sidebar onNavigate={onNavigate} />)
    expect(screen.getByRole('link', { name: /show chores/i })).toBeInTheDocument()
  })

  it('marks the Show Chores link as current when activeItem is show-chores', () => {
    render(<Sidebar activeItem="show-chores" onNavigate={onNavigate} />)
    expect(screen.getByRole('link', { name: /show chores/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('calls onNavigate with add-chore when the Add Chore link is clicked', async () => {
    render(<Sidebar onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: /add chore/i }))
    expect(onNavigate).toHaveBeenCalledWith('add-chore')
  })

  it('calls onNavigate with show-chores when the Show Chores link is clicked', async () => {
    render(<Sidebar onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: /show chores/i }))
    expect(onNavigate).toHaveBeenCalledWith('show-chores')
  })
})
