import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Sidebar } from '../../src/components/Sidebar'

function renderSidebar(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
      <Routes>
        <Route path="/add-chore" element={<div data-testid="add-chore-page" />} />
        <Route path="/chores" element={<div data-testid="show-chores-page" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('renders a navigation landmark', () => {
    renderSidebar('/add-chore')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders the app name', () => {
    renderSidebar('/add-chore')
    expect(screen.getByText('Allowance')).toBeInTheDocument()
  })

  it('renders an Add Chore nav item', () => {
    renderSidebar('/add-chore')
    expect(screen.getByRole('link', { name: /add chore/i })).toBeInTheDocument()
  })

  it('marks the Add Chore link as current when browsing /add-chore', () => {
    renderSidebar('/add-chore')
    expect(screen.getByRole('link', { name: /add chore/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not mark the Add Chore link as current when browsing /chores', () => {
    renderSidebar('/chores')
    expect(screen.getByRole('link', { name: /add chore/i })).not.toHaveAttribute('aria-current')
  })

  it('renders a Chores nav item', () => {
    renderSidebar('/add-chore')
    expect(screen.getByRole('link', { name: /chores/i })).toBeInTheDocument()
  })

  it('marks the Chores link as current when browsing /chores', () => {
    renderSidebar('/chores')
    expect(screen.getByRole('link', { name: /chores/i })).toHaveAttribute('aria-current', 'page')
  })

  it('navigates to the Add Chore page when its link is clicked', async () => {
    renderSidebar('/chores')
    await userEvent.click(screen.getByRole('link', { name: /add chore/i }))
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })

  it('navigates to the Chores page when its link is clicked', async () => {
    renderSidebar('/add-chore')
    await userEvent.click(screen.getByRole('link', { name: /chores/i }))
    expect(screen.getByTestId('show-chores-page')).toBeInTheDocument()
  })
})
