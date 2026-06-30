import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'

type EditTarget = { kind: 'canvas' | 'note'; id: string } | null

export function Sidebar(): React.ReactElement {
  const vault = useApp((s) => s.vault)
  const index = useApp((s) => s.index)
  const activeCanvasId = useApp((s) => s.activeCanvasId)
  const openNoteId = useApp((s) => s.openNoteId)
  const chooseVault = useApp((s) => s.chooseVault)
  const createCanvas = useApp((s) => s.createCanvas)
  const createNote = useApp((s) => s.createNote)
  const openCanvas = useApp((s) => s.openCanvas)
  const openNote = useApp((s) => s.openNote)
  const renameCanvas = useApp((s) => s.renameCanvas)
  const renameNote = useApp((s) => s.renameNote)

  const [editing, setEditing] = useState<EditTarget>(null)
  const [draft, setDraft] = useState('')

  // Inline note creation state
  const [creatingNote, setCreatingNote] = useState(false)
  const [newNoteName, setNewNoteName] = useState('')
  const newNoteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingNote) newNoteInputRef.current?.focus()
  }, [creatingNote])

  const startEdit = (kind: 'canvas' | 'note', id: string, current: string): void => {
    setEditing({ kind, id })
    setDraft(current)
  }

  const commitEdit = (): void => {
    if (!editing) return
    const trimmed = draft.trim()
    if (trimmed) {
      if (editing.kind === 'canvas') void renameCanvas(editing.id, trimmed)
      else void renameNote(editing.id, trimmed)
    }
    setEditing(null)
  }

  const handleStartNewNote = (): void => {
    setNewNoteName('')
    setCreatingNote(true)
  }

  const handleCommitNewNote = (): void => {
    const name = newNoteName.trim()
    setCreatingNote(false)
    setNewNoteName('')
    if (name) {
      void createNote(name).then((meta) => openNote(meta.id))
    }
  }

  const handleCancelNewNote = (): void => {
    setCreatingNote(false)
    setNewNoteName('')
  }

  const renderItem = (
    kind: 'canvas' | 'note',
    id: string,
    titleText: string,
    icon: string,
    active: boolean,
    onOpen: () => void
  ): React.ReactElement => {
    const isEditing = editing?.kind === kind && editing.id === id
    return (
      <li
        key={id}
        className={`tree-item ${active ? 'active' : ''}`}
        onClick={() => !isEditing && onOpen()}
        onDoubleClick={() => startEdit(kind, id, titleText)}
        title="Double-click to rename"
      >
        <span className="tree-icon">{icon}</span>
        {isEditing ? (
          <input
            className="tree-rename"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(null)
            }}
            spellCheck={false}
          />
        ) : (
          <span className="tree-label">{titleText}</span>
        )}
      </li>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section vault-header">
        <div className="vault-name" title={vault.path ?? ''}>
          {vault.name ?? 'No vault'}
        </div>
        <button className="link-btn" onClick={() => void chooseVault()}>
          {vault.path ? 'Switch' : 'Open vault'}
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Canvases</span>
          <button
            className="icon-btn"
            disabled={!vault.path}
            onClick={() => void createCanvas('Untitled canvas')}
            title="New canvas"
          >
            +
          </button>
        </div>
        <ul className="tree">
          {index.canvases.map((c) =>
            renderItem('canvas', c.id, c.title, '\u{1F5BC}', c.id === activeCanvasId, () =>
              openCanvas(c.id)
            )
          )}
          {index.canvases.length === 0 && (
            <li className="tree-empty">No canvases yet</li>
          )}
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Notes</span>
          <button
            className="icon-btn"
            disabled={!vault.path}
            onClick={handleStartNewNote}
            title="New note"
          >
            +
          </button>
        </div>
        <ul className="tree">
          {creatingNote && (
            <li className="tree-item">
              <span className="tree-icon">{'\u{1F4DD}'}</span>
              <input
                ref={newNoteInputRef}
                className="tree-rename"
                value={newNoteName}
                placeholder="Note filename..."
                onChange={(e) => setNewNoteName(e.target.value)}
                onBlur={handleCancelNewNote}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitNewNote()
                  if (e.key === 'Escape') handleCancelNewNote()
                }}
                spellCheck={false}
              />
            </li>
          )}
          {index.notes.map((n) =>
            renderItem('note', n.id, n.title, '\u{1F4DD}', n.id === openNoteId, () =>
              openNote(n.id)
            )
          )}
          {index.notes.length === 0 && !creatingNote && (
            <li className="tree-empty">No notes yet</li>
          )}
        </ul>
      </div>
    </aside>
  )
}
