/// Round badge showing how many people a chore is assigned to (0, 1, or M for
/// multiple). Hovering or focusing the badge reveals the assignee names.

import { useId, useState } from 'react'
import type { Assignee } from '../types/chore'
import './AssigneeIndicator.css'

interface AssigneeIndicatorProps {
  assignees: Assignee[]
}

function badgeLabel(count: number): string {
  if (count > 1) return 'M'
  return String(count)
}

export function AssigneeIndicator({ assignees }: AssigneeIndicatorProps) {
  const [open, setOpen] = useState(false)
  const popupId = useId()

  return (
    <span
      className="assignee-indicator"
      tabIndex={0}
      aria-label={`Assignees: ${assignees.length}`}
      aria-describedby={open ? popupId : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className="assignee-indicator__badge" aria-hidden="true">
        {badgeLabel(assignees.length)}
      </span>
      {open && (
        <span className="assignee-indicator__popup" role="tooltip" id={popupId}>
          {assignees.length === 0 ? (
            'No assignees'
          ) : (
            <ol className="assignee-indicator__list">
              {assignees.map((assignee) => (
                <li key={assignee.id}>{assignee.name}</li>
              ))}
            </ol>
          )}
        </span>
      )}
    </span>
  )
}
