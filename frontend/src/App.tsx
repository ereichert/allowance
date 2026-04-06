import { AddChoreIcon } from './components/AddChoreIcon'
import { Sidebar } from './components/Sidebar'
import { AddChorePage } from './pages/AddChorePage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Sidebar activeItem="add-chore" />
      <div className="app-shell__main">
        <header className="app-header">
          <h1 className="app-header__title">
            <AddChoreIcon size={20} />
            Add Chore
          </h1>
        </header>
        <main className="app-shell__content">
          <AddChorePage />
        </main>
        <footer className="app-footer">
          <p>Allowance &mdash; Chore Manager</p>
        </footer>
      </div>
    </div>
  )
}

export default App
