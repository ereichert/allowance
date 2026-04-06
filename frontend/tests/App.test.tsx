import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../src/App'

vi.mock('../src/components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}))

vi.mock('../src/pages/AddChorePage', () => ({
  AddChorePage: () => <div data-testid="add-chore-page" />,
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
})
