import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../src/App'

vi.mock('../src/pages/AddChorePage', () => ({
  AddChorePage: () => <div data-testid="add-chore-page" />,
}))

vi.mock('../src/pages/ShowChoresPage', () => ({
  ShowChoresPage: () => <div data-testid="show-chores-page" />,
}))

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a header', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders the page title in the header', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('banner')).toHaveTextContent('Add Chore')
  })

  it('renders a footer', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders app name in the footer', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/allowance/i)
  })

  it('renders the sidebar', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders the main content area', () => {
    renderApp('/add-chore')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders the Add Chore page at /add-chore', () => {
    renderApp('/add-chore')
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })

  it('redirects / to the Add Chore page', () => {
    renderApp('/')
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })

  it('redirects an unknown path to the Add Chore page', () => {
    renderApp('/some-unknown-path')
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })

  it('renders the Chores page and header title at /chores', () => {
    renderApp('/chores')
    expect(screen.getByRole('banner')).toHaveTextContent('Chores')
    expect(screen.getByTestId('show-chores-page')).toBeInTheDocument()
    expect(screen.queryByTestId('add-chore-page')).not.toBeInTheDocument()
  })

  it('switches to the Chores page and header title when navigated', async () => {
    renderApp('/add-chore')
    await userEvent.click(screen.getByRole('link', { name: /chores/i }))

    expect(screen.getByRole('banner')).toHaveTextContent('Chores')
    expect(screen.getByTestId('show-chores-page')).toBeInTheDocument()
    expect(screen.queryByTestId('add-chore-page')).not.toBeInTheDocument()
  })

  it('switches back to the Add Chore page when navigated', async () => {
    renderApp('/chores')
    await userEvent.click(screen.getByRole('link', { name: /add chore/i }))

    expect(screen.getByRole('banner')).toHaveTextContent('Add Chore')
    expect(screen.getByTestId('add-chore-page')).toBeInTheDocument()
  })
})
