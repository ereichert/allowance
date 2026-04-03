import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AddChorePage } from '../../src/pages/AddChorePage'
import * as hooks from '../../src/hooks/useCreateChore'
import * as peopleHooks from '../../src/hooks/usePeople'

vi.mock('../../src/hooks/useCreateChore')
vi.mock('../../src/hooks/usePeople')

const mockUseCreateChore = vi.mocked(hooks.useCreateChore)
const mockUsePeople = vi.mocked(peopleHooks.usePeople)

function makeChoreHook(overrides: Partial<ReturnType<typeof hooks.useCreateChore>> = {}) {
  return {
    submit: vi.fn().mockResolvedValue('idle'),
    status: 'idle' as const,
    errorMessage: null,
    reset: vi.fn(),
    ...overrides,
  }
}

function makePeopleHook(overrides = {}) {
  return {
    people: [],
    loading: false,
    error: null,
    ...overrides,
  }
}

describe('AddChorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePeople.mockReturnValue(makePeopleHook())
  })

  it('renders the add chore form', () => {
    mockUseCreateChore.mockReturnValue(makeChoreHook())
    render(<AddChorePage />)
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('shows success message after a successful save', () => {
    mockUseCreateChore.mockReturnValue(makeChoreHook({ status: 'success' }))
    render(<AddChorePage />)
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument()
  })

  it('shows error message when status is error', () => {
    mockUseCreateChore.mockReturnValue(
      makeChoreHook({ status: 'error', errorMessage: 'Something went wrong' }),
    )
    render(<AddChorePage />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('calls submit when the form is saved', async () => {
    const submit = vi.fn().mockResolvedValue('success')
    mockUseCreateChore.mockReturnValue(makeChoreHook({ submit }))
    render(<AddChorePage />)

    await userEvent.type(screen.getByLabelText(/description/i), 'Sweep')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Sweep' }),
    )
  })

  it('disables the form while loading', () => {
    mockUseCreateChore.mockReturnValue(makeChoreHook({ status: 'loading' }))
    render(<AddChorePage />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
})
