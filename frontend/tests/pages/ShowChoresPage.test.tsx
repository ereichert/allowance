import { render, screen } from '@testing-library/react'
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
})
