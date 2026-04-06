import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Sidebar } from '../../src/components/Sidebar'

describe('Sidebar', () => {
  it('renders a navigation landmark', () => {
    render(<Sidebar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders the app name', () => {
    render(<Sidebar />)
    expect(screen.getByText('Allowance')).toBeInTheDocument()
  })

  it('renders an Add Chore nav item', () => {
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /add chore/i })).toBeInTheDocument()
  })

  it('marks the Add Chore link as current when activeItem is add-chore', () => {
    render(<Sidebar activeItem="add-chore" />)
    expect(screen.getByRole('link', { name: /add chore/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not mark any link as current when no activeItem is set', () => {
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /add chore/i })).not.toHaveAttribute('aria-current')
  })
})
