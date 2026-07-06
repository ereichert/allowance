import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
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
    totalPages: 1,
    ...overrides,
  }
}

function SearchParamsProbe() {
  const [searchParams] = useSearchParams()
  return <div data-testid="search-params">{searchParams.toString()}</div>
}

function renderShowChoresPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ShowChoresPage />
      <SearchParamsProbe />
    </MemoryRouter>,
  )
}

describe('ShowChoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while chores are loading', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ loading: true }))
    renderShowChoresPage('/chores')
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
    renderShowChoresPage('/chores')
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ error: 'Failed to load chores' }))
    renderShowChoresPage('/chores')
    expect(screen.getByText('Failed to load chores')).toBeInTheDocument()
  })

  it('fetches the page number given in the URL', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 5 }))
    renderShowChoresPage('/chores?page=3')
    expect(mockUseChores).toHaveBeenCalledWith(3)
  })

  it('defaults to page 1 when there is no page param in the URL', () => {
    mockUseChores.mockReturnValue(makeChoresHook())
    renderShowChoresPage('/chores')
    expect(mockUseChores).toHaveBeenCalledWith(1)
  })

  it('renders pagination controls even when there is only one page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 1 }))
    renderShowChoresPage('/chores')
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('disables both Previous and Next when there is only one page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 1 }))
    renderShowChoresPage('/chores')
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('shows the current page and total pages', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 5 }))
    renderShowChoresPage('/chores?page=2')
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument()
  })

  it('disables Previous on the first page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores')
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('enables Previous when not on the first page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores?page=2')
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
  })

  it('disables Next on the last page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores?page=3')
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next when not on the last page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores')
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('updates the URL to the next page when Next is clicked', async () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByTestId('search-params')).toHaveTextContent('page=2')
  })

  it('updates the URL to the previous page when Previous is clicked', async () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 3 }))
    renderShowChoresPage('/chores?page=2')
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByTestId('search-params')).not.toHaveTextContent('page=')
  })

  it('redirects to page 1 when the requested page is beyond the last page', () => {
    mockUseChores.mockReturnValue(makeChoresHook({ totalPages: 2 }))
    renderShowChoresPage('/chores?page=99')
    expect(screen.getByTestId('search-params')).not.toHaveTextContent('page=')
  })
})
