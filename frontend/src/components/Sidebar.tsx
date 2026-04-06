/// VS Code-style sidebar with app branding and primary navigation.

import { AddChoreIcon } from './AddChoreIcon'
import './Sidebar.css'

interface SidebarProps {
  /** The nav item that corresponds to the current page. */
  activeItem?: 'add-chore'
}

export function Sidebar({ activeItem }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          💵
        </span>
        <span className="sidebar__app-name">Allowance</span>
      </div>
      <nav>
        <ul className="sidebar__nav">
          <li>
            <a
              href="/"
              className="sidebar__nav-link"
              aria-current={activeItem === 'add-chore' ? 'page' : undefined}
            >
              <AddChoreIcon size={15} />
              Add Chore
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
