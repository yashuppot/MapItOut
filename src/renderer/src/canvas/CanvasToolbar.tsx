import { useState } from 'react'
import { createShapeId, type Editor } from 'tldraw'
import { useApp } from '../store'
import { NOTE_LINK_DEFAULT_SIZE } from './shapes/NoteLinkShape'
import { CANVAS_LINK_DEFAULT_SIZE } from './shapes/CanvasLinkShape'
import { NotePicker } from './NotePicker'

interface Props {
  canvasId: string
  editor: Editor
}

export function CanvasToolbar({ canvasId, editor }: Props): React.ReactElement {
  const createNote = useApp((s) => s.createNote)
  const openNote = useApp((s) => s.openNote)
  const notes = useApp((s) => s.index.notes)
  const canvases = useApp((s) => s.index.canvases)

  const [promptingName, setPromptingName] = useState(false)
  const [pendingName, setPendingName] = useState('')

  const center = (): { x: number; y: number } => {
    const b = editor.getViewportPageBounds()
    return { x: b.center.x, y: b.center.y }
  }

  const placeNoteCard = (noteId: string, title: string): void => {
    const c = center()
    const id = createShapeId()
    editor.createShape({
      id,
      type: 'note-link',
      x: c.x - NOTE_LINK_DEFAULT_SIZE.w / 2,
      y: c.y - NOTE_LINK_DEFAULT_SIZE.h / 2,
      props: { w: NOTE_LINK_DEFAULT_SIZE.w, h: NOTE_LINK_DEFAULT_SIZE.h, noteId, title }
    })
    editor.select(id)
  }

  const handleNoteNameSubmit = async (name: string): Promise<void> => {
    setPromptingName(false)
    setPendingName('')
    const meta = await createNote(name.trim() || 'Untitled')
    placeNoteCard(meta.id, meta.title)
    openNote(meta.id)
  }

  const handleLinkExistingNoteCard = (noteId: string): void => {
    const note = notes.find((n) => n.id === noteId)
    if (note) placeNoteCard(note.id, note.title)
  }

  const handleAddCanvasLink = (targetId: string): void => {
    const target = canvases.find((c) => c.id === targetId)
    if (!target) return
    const c = center()
    const id = createShapeId()
    editor.createShape({
      id,
      type: 'canvas-link',
      x: c.x - CANVAS_LINK_DEFAULT_SIZE.w / 2,
      y: c.y - CANVAS_LINK_DEFAULT_SIZE.h / 2,
      props: { w: CANVAS_LINK_DEFAULT_SIZE.w, h: CANVAS_LINK_DEFAULT_SIZE.h, canvasId: target.id, title: target.title }
    })
    editor.select(id)
  }

  const otherCanvases = canvases.filter((c) => c.id !== canvasId)

  return (
    <div className="canvas-toolbar">
      <div className="toolbar-group">
        {promptingName ? (
          <input
            className="toolbar-input"
            autoFocus
            value={pendingName}
            placeholder="Note filename..."
            onChange={(e) => setPendingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleNoteNameSubmit(pendingName)
              if (e.key === 'Escape') { setPromptingName(false); setPendingName('') }
            }}
            onBlur={() => { setPromptingName(false); setPendingName('') }}
          />
        ) : (
          <button
            className="toolbar-btn"
            onClick={() => { setPendingName(''); setPromptingName(true) }}
            title="Create a new note and place a linked card on the canvas"
          >
            + Note card
          </button>
        )}
        <NotePicker
          notes={notes}
          placeholder={notes.length === 0 ? 'No notes yet' : 'Link existing note...'}
          onSelect={handleLinkExistingNoteCard}
          disabled={notes.length === 0}
        />
        <select
          className="toolbar-select"
          value=""
          onChange={(e) => {
            handleAddCanvasLink(e.target.value)
            e.currentTarget.value = ''
          }}
          title="Place a link to another canvas"
          disabled={otherCanvases.length === 0}
        >
          <option value="" disabled>
            {otherCanvases.length === 0 ? 'No other canvases' : 'Link canvas...'}
          </option>
          {otherCanvases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
