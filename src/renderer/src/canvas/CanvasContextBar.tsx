import { useState, useEffect } from 'react'
import { type Editor } from 'tldraw'
import { useApp } from '../store'
import { type NoteLinkShape } from './shapes/NoteLinkShape'
import { NotePicker } from './NotePicker'

const LINK_SHAPE_TYPES = new Set(['note-link', 'canvas-link'])

function useEditorValue<T>(editor: Editor, compute: () => T): T {
  const [value, setValue] = useState<T>(compute)
  useEffect(() => {
    setValue(compute())
    return editor.store.listen(() => setValue(compute()), { scope: 'session', source: 'all' })
  }, [editor])
  return value
}

interface Props {
  editor: Editor
}

export function CanvasContextBar({ editor }: Props): React.ReactElement | null {
  const createNote = useApp((s) => s.createNote)
  const openNote = useApp((s) => s.openNote)
  const notes = useApp((s) => s.index.notes)

  const selected = useEditorValue(editor, () => editor.getSelectedShapes())

  const single = selected.length === 1 ? selected[0] : null
  const linkable = single && !LINK_SHAPE_TYPES.has(single.type) ? single : null
  const linkedNoteId = (linkable?.meta?.noteId as string | undefined) || undefined
  const linkedNote = linkedNoteId ? notes.find((n) => n.id === linkedNoteId) : undefined
  const noteLink = single?.type === 'note-link' ? (single as NoteLinkShape) : null
  const noteLinkTarget = noteLink?.props.noteId
    ? notes.find((n) => n.id === noteLink.props.noteId)
    : undefined

  if (!noteLink && !linkable) return null

  const attachNote = (noteId: string): void => {
    if (!linkable) return
    editor.updateShape({ id: linkable.id, type: linkable.type, meta: { ...linkable.meta, noteId } })
  }

  const handleAttachNewNote = async (): Promise<void> => {
    if (!linkable) return
    const meta = await createNote('Untitled note')
    attachNote(meta.id)
    openNote(meta.id)
  }

  const handleUnlinkNote = (): void => {
    if (!linkable) return
    const nextMeta = { ...linkable.meta }
    delete (nextMeta as Record<string, unknown>).noteId
    editor.updateShape({ id: linkable.id, type: linkable.type, meta: nextMeta })
  }

  return (
    <div className="canvas-context">
      {noteLink ? (
        <div className="toolbar-group toolbar-group-context">
          <span className="toolbar-label">Card:</span>
          <input
            className="toolbar-input"
            type="text"
            value={noteLink.props.title}
            placeholder="Card title"
            onChange={(e) =>
              editor.updateShape({
                id: noteLink.id,
                type: 'note-link',
                props: { ...noteLink.props, title: e.target.value }
              })
            }
            title="Edit card title"
          />
          <span className="toolbar-label">Note:</span>
          <NotePicker
            notes={notes}
            value={noteLink.props.noteId || undefined}
            placeholder="— no note linked —"
            direction="up"
            onSelect={(noteId) =>
              editor.updateShape({
                id: noteLink.id,
                type: 'note-link',
                props: { ...noteLink.props, noteId }
              })
            }
          />
          <button
            className="toolbar-btn"
            onClick={() => noteLink.props.noteId && openNote(noteLink.props.noteId)}
            disabled={!noteLink.props.noteId || !noteLinkTarget}
            title="Open linked note"
          >
            Open
          </button>
          {noteLink.props.noteId && (
            <button
              className="toolbar-btn ghost"
              onClick={() =>
                editor.updateShape({
                  id: noteLink.id,
                  type: 'note-link',
                  props: { ...noteLink.props, noteId: '' }
                })
              }
              title="Remove note link"
            >
              Remove link
            </button>
          )}
        </div>
      ) : linkedNoteId ? (
        <div className="toolbar-group toolbar-group-context">
          <button
            className="toolbar-btn"
            onClick={() => openNote(linkedNoteId)}
            title="Open the note linked to this selection"
          >
            Open note: {linkedNote?.title ?? 'note'}
          </button>
          <button
            className="toolbar-btn ghost"
            onClick={handleUnlinkNote}
            title="Remove the note link from this selection"
          >
            Unlink
          </button>
        </div>
      ) : (
        <div className="toolbar-group toolbar-group-context">
          <span className="toolbar-label">Attach note:</span>
          <button
            className="toolbar-btn"
            onClick={() => void handleAttachNewNote()}
            title="Create a new note and link it to the selected shape"
          >
            + New
          </button>
          <NotePicker
            notes={notes}
            placeholder={notes.length === 0 ? 'No notes yet' : 'Existing...'}
            direction="up"
            onSelect={attachNote}
            disabled={notes.length === 0}
          />
        </div>
      )}
    </div>
  )
}
