/// Displays success or error feedback after a form action.
/// Returns null when idle or loading so the layout doesn't shift.

import './StatusMessage.css'

interface StatusMessageProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string | null
}

export function StatusMessage({ status, message }: StatusMessageProps) {
  if (status === 'success') {
    return (
      <p role="status" className="status-message status-message--success">
        {message}
      </p>
    )
  }

  if (status === 'error' && message) {
    return (
      <p role="alert" className="status-message status-message--error">
        {message}
      </p>
    )
  }

  return null
}
