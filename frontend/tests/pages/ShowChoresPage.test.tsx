import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ShowChoresPage } from '../../src/pages/ShowChoresPage'
import * as hooks from '../../src/hooks/useChores'

vi.mock('../../src/hooks/useChores')

const mockUseChores = vi.mocked(hooks.useChores)

function makeChoresHook(overrides: Partial<ReturnType<typeof hooks.useChores>> = {}) {
  return {
    chores: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    goToNextPage: vi.fn(),
    goToPreviousPage: vi.fn(),
    ...overrides,
  }
}

describe('ShowChoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while chores are loading', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ loading: true }))
    render(<ShowChoresPage />)
    expect(screen.getByText(/loading chores/i)).toBeInTheDocument()
  })

  it('renders the fetched chores in the table', () => {
    mockUseChores.mockReturnValue(
      makeChoresHook({
        chores: [
          {
            id: 'c1',
            description: 'Take out trash',
            value_cents: 100,
            recurrence_cron: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    )
    render(<ShowChoresPage />)
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ error: 'Failed to load chores' }))
    render(<ShowChoresPage />)
    expect(screen.getByText('Failed to load chores')).toBeInTheDocument()
  })

  it('does not render pagination controls when there is only one page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 1 }))
    render(<ShowChoresPage />)
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('renders pagination controls when there is more than one page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    render(<ShowChoresPage />)
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('shows the current page and total pages', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ page: 2, totalPages: 5 }))
    render(<ShowChoresPage />)
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument()
  })

  it('disables Previous on the first page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ page: 1, totalPages: 3 }))
    render(<ShowChoresPage />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('enables Previous when not on the first page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ page: 2, totalPages: 3 }))
    render(<ShowChoresPage />)
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
  })

  it('disables Next on the last page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ page: 3, totalPages: 3 }))
    render(<ShowChoresPage />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next when not on the last page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ page: 1, totalPages: 3 }))
    render(<ShowChoresPage />)
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('calls goToNextPage when Next is clicked', async () => {
    const goToNextPage = vi.fn()
    mockUseChores.mockReturnValue(makeChoresHook({ page: 1, totalPages: 3, goToNextPage }))
    render(<ShowChoresPage />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(goToNextPage).toHaveBeenCalled()
  })

  it('calls goToPreviousPage when Previous is clicked', async () => {
    const goToPreviousPage = vi.fn()
    mockUseChores.mockReturnValue(makeChoresHook({ page: 2, totalPages: 3, goToPreviousPage }))
    render(<ShowChoresPage />)
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(goToPreviousPage).toHaveBeenCalled()
  })
})
