/// VS Code-style sidebar with app branding and primary navigation.

import { NavLink } from 'react-router-dom'
import { AddChoreIcon } from './AddChoreIcon'
import { ShowChoresIcon } from './ShowChoresIcon'
import './Sidebar.css'

export function Sidebar() {
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
            <NavLink to="/add-chore" className="sidebar__nav-link">
              <AddChoreIcon size={15} />
              Add Chore
            </NavLink>
          </li>
          <li>
            <NavLink to="/chores" className="sidebar__nav-link">
              <ShowChoresIcon size={15} />
              Chores
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
