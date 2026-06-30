import { useEffect, useRef, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { useApp } from '../store'

type SaveState = 'idle' | 'saving' | 'saved'

export function NotePanel(): React.ReactElement | null {
  const openNoteId = useApp((s) => s.openNoteId)
  const notes = useApp((s) => s.index.notes)
  const closeNote = useApp((s) => s.closeNote)
  const renameNote = useApp((s) => s.renameNote)

  const [value, setValue] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const note = notes.find((n) => n.id === openNoteId)

  useEffect(() => {
    if (!openNoteId) return
    let cancelled = false
    setLoading(true)
    setSaveState('idle')
    void (async () => {
      const content = await window.api.note.read(openNoteId)
      if (cancelled) return
      setValue(content)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [openNoteId])

  useEffect(() => {
    setTitle(note?.title ?? '')
  }, [note?.title])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  if (!openNoteId) return null

  const flushSave = (text: string): void => {
    void window.api.note.write(openNoteId, text)
    setSaveState('saved')
  }

  const handleChange = (next?: string): void => {
    const text = next ?? ''
    setValue(text)
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => flushSave(text), 400)
  }

  const commitTitle = (): void => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== note?.title) {
      void renameNote(openNoteId, trimmed)
    } else {
      setTitle(note?.title ?? '')
    }
  }

  const handleClose = (): void => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      flushSave(value)
    }
    closeNote()
  }

  return (
    <aside className="note-panel" data-color-mode="dark">
      <header className="note-panel-header">
        <input
          className="note-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTitle(note?.title ?? '')
              e.currentTarget.blur()
            }
          }}
          spellCheck={false}
          title="Rename note"
        />
        <span className="save-state">
          {saveState === 'saving'
            ? 'Saving...'
            : saveState === 'saved'
              ? 'Saved'
              : ''}
        </span>
        <button className="icon-btn" onClick={handleClose} title="Close note">
          {'\u2715'}
        </button>
      </header>
      <div className="note-panel-body">
        {loading ? (
          <div className="canvas-status">Loading note...</div>
        ) : (
          <MDEditor
            value={value}
            onChange={handleChange}
            height="100%"
            visibleDragbar={false}
          />
        )}
      </div>
    </aside>
  )
}
