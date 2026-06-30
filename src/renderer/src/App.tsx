import { useEffect, useState } from 'react'
import { useApp } from './store'
import { Sidebar } from './components/Sidebar'
import { CanvasView } from './canvas/CanvasView'
import { NotePanel } from './notes/NotePanel'

export default function App(): React.ReactElement {
  const ready = useApp((s) => s.ready)
  const vault = useApp((s) => s.vault)
  const init = useApp((s) => s.init)
  const chooseVault = useApp((s) => s.chooseVault)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return <div className="app-status">Starting...</div>
  }

  if (!vault.path) {
    return (
      <div className="welcome">
        <div className="welcome-card">
          <h1>PKM Canvas</h1>
          <p>
            An infinite canvas for image-first knowledge, with notes and linked
            canvases stored as plain files on your machine.
          </p>
          <button className="primary-btn" onClick={() => void chooseVault()}>
            Choose vault folder
          </button>
          <p className="welcome-hint">
            Pick an empty folder (or an existing vault). Your canvases, notes,
            and images will be saved there.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      {sidebarOpen && <Sidebar />}
      <main className="main-area">
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        <CanvasView />
      </main>
      <NotePanel />
    </div>
  )
}
