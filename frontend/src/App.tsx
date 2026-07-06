import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AddChoreIcon } from './components/AddChoreIcon'
import { ShowChoresIcon } from './components/ShowChoresIcon'
import { Sidebar } from './components/Sidebar'
import { AddChorePage } from './pages/AddChorePage'
import { ShowChoresPage } from './pages/ShowChoresPage'
import './App.css'

function App() {
  const location = useLocation()
  const onChoresPage = location.pathname === '/chores'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <header className="app-header">
          <h1 className="app-header__title">
            {onChoresPage ? (
              <>
                <ShowChoresIcon size={20} />
                Chores
              </>
            ) : (
              <>
                <AddChoreIcon size={20} />
                Add Chore
              </>
            )}
          </h1>
        </header>
        <main className="app-shell__content">
          <Routes>
            <Route path="/" element={<Navigate to="/add-chore" replace />} />
            <Route path="/add-chore" element={<AddChorePage />} />
            <Route path="/chores" element={<ShowChoresPage />} />
            <Route path="*" element={<Navigate to="/add-chore" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>Allowance &mdash; Chore Manager</p>
        </footer>
      </div>
    </div>
  )
}

export default App
