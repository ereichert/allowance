/// VS Code-style sidebar with app branding and primary navigation.

import { AddChoreIcon } from './AddChoreIcon'
import { ShowChoresIcon } from './ShowChoresIcon'
import './Sidebar.css'

type NavItem = 'add-chore' | 'show-chores'

interface SidebarProps {
  /** The nav item that corresponds to the current page. */
  activeItem?: NavItem
  /** Called when the user selects a nav item. There's no router in this app —
   * App.tsx owns page state directly, per docs/architecture.md's "Layer 6:
   * App.tsx — Root component and routing." */
  onNavigate: (item: NavItem) => void
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  function handleClick(item: NavItem) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      onNavigate(item)
    }
  }

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
              onClick={handleClick('add-chore')}
            >
              <AddChoreIcon size={15} />
              Add Chore
            </a>
          </li>
          <li>
            <a
              href="/chores"
              className="sidebar__nav-link"
              aria-current={activeItem === 'show-chores' ? 'page' : undefined}
              onClick={handleClick('show-chores')}
            >
              <ShowChoresIcon size={15} />
              Chores
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
