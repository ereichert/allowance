import { useState } from 'react'
import { AddChoreIcon } from './components/AddChoreIcon'
import { ShowChoresIcon } from './components/ShowChoresIcon'
import { Sidebar } from './components/Sidebar'
import { AddChorePage } from './pages/AddChorePage'
import { ShowChoresPage } from './pages/ShowChoresPage'
import './App.css'

type Page = 'add-chore' | 'show-chores'

function App() {
  const [page, setPage] = useState<Page>('add-chore')

  return (
    <div className="app-shell">
      <Sidebar activeItem={page} onNavigate={setPage} />
      <div className="app-shell__main">
        <header className="app-header">
          <h1 className="app-header__title">
            {page === 'add-chore' ? (
              <>
                <AddChoreIcon size={20} />
                Add Chore
              </>
            ) : (
              <>
                <ShowChoresIcon size={20} />
                Show Chores
              </>
            )}
          </h1>
        </header>
        <main className="app-shell__content">
          {page === 'add-chore' ? <AddChorePage /> : <ShowChoresPage />}
        </main>
        <footer className="app-footer">
          <p>Allowance &mdash; Chore Manager</p>
        </footer>
      </div>
    </div>
  )
}

export default App
