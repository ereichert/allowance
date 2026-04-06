import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusMessage } from '../../src/components/StatusMessage'

describe('StatusMessage', () => {
  it('renders nothing when status is idle', () => {
    render(<StatusMessage status="idle" message={null} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders nothing when status is loading', () => {
    render(<StatusMessage status="loading" message={null} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders a status message when status is success', () => {
    render(<StatusMessage status="success" message="Chore saved successfully." />)
    expect(screen.getByRole('status')).toHaveTextContent('Chore saved successfully.')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an alert when status is error and message is provided', () => {
    render(<StatusMessage status="error" message="Something went wrong." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renders nothing when status is error but message is null', () => {
    render(<StatusMessage status="error" message={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
