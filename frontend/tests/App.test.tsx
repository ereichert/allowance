import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../src/App'

vi.mock('../src/components/Sidebar', () => ({
  Sidebar: ({ onNavigate }: { onNavigate: (item: 'add-chore' | 'show-chores') => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => onNavigate('add-chore')}>Add Chore</button>
      <button onClick={() => onNavigate('show-chores')}>Show Chores</button>
    </div>
  ),
}))

vi.mock('../src/pages/AddChorePage', () => ({
  AddChorePage: () => <div data-testid="add-chore-page" />,
}))

vi.mock('../src/pages/ShowChoresPage', () => ({
  ShowChoresPage: () => <div data-testid="show-chores-page" />,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a header', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders the page title in the header', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toHaveTextContent('Add Chore')
  })

  it('renders a footer', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders app name in the footer', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/allowance/i)
  })

  it('renders the sidebar', () => {
    render(<App />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders the main content area', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders the Add Chore page by default', () => {
    render(<App />)
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })

  it('switches to the Show Chores page and header title when navigated', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /show chores/i }))

    expect(screen.getByRole('banner')).toHaveTextContent('Show Chores')
    expect(screen.getByTestId('show-chores-page')).toBeInTheDocument()
    expect(screen.queryByTestId('add-chore-page')).not.toBeInTheDocument()
  })

  it('switches back to the Add Chore page when navigated', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /show chores/i }))
    await userEvent.click(screen.getByRole('button', { name: /add chore/i }))

    expect(screen.getByRole('banner')).toHaveTextContent('Add Chore')
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })
})
