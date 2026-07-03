import { useEffect, useRef, useState } from 'react'
import {
  DefaultStylePanel,
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  getSnapshot,
  loadSnapshot,
  useEditor,
  useValue,
  type Editor,
  type TLStoreSnapshot
} from 'tldraw'
import 'tldraw/tldraw.css'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { useApp } from '../store'
import { NoteLinkShapeUtil, type NoteLinkShape } from './shapes/NoteLinkShape'
import { CanvasLinkShapeUtil } from './shapes/CanvasLinkShape'
import { vaultAssetStore } from './assetStore'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasContextBar } from './CanvasContextBar'

const customShapeUtils = [NoteLinkShapeUtil, CanvasLinkShapeUtil]

// Hide the style panel when:
//  - nothing selected + passive navigation tool (select, hand, zoom, laser)
//  - only link-card shapes selected (they have no styleable tldraw properties)
const PASSIVE_TOOLS = new Set(['select', 'hand', 'zoom', 'laser'])
const LINK_SHAPE_TYPES = new Set(['note-link', 'canvas-link'])

function ConditionalStylePanel(): React.ReactElement | null {
  const editor = useEditor()
  const show = useValue('showStylePanel', () => {
    const selectedIds = editor.getSelectedShapeIds()
    if (selectedIds.length === 0) {
      return !PASSIVE_TOOLS.has(editor.getCurrentToolId())
    }
    const shapes = editor.getSelectedShapes()
    if (shapes.every((s) => LINK_SHAPE_TYPES.has(s.type))) return false
    return true
  }, [editor])
  if (!show) return null
  return <DefaultStylePanel />
}

const tlComponents = { StylePanel: ConditionalStylePanel }

// Bundle tldraw's UI icons/fonts locally so the app works offline (instead of
// fetching them from cdn.tldraw.com, which the CSP also blocks).
const assetUrls = getAssetUrlsByImport()

function CanvasInstance({ id }: { id: string }): React.ReactElement {
  const [store] = useState(() =>
    createTLStore({
      shapeUtils: [...defaultShapeUtils, ...customShapeUtils],
      assets: vaultAssetStore
    })
  )
  const [ready, setReady] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the persisted snapshot into the controlled store before mounting,
  // so we never autosave an empty canvas over real data.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const snapshot = await window.api.canvas.read(id)
      if (cancelled) return
      if (snapshot) {
        try {
          loadSnapshot(store, {
            document: snapshot as TLStoreSnapshot
          })
        } catch (err) {
          console.error('Failed to load canvas snapshot', err)
        }
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [id, store])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (unlistenRef.current) unlistenRef.current()
      useApp.getState().registerNoteIdPatcher(null)
    }
  }, [])

  const handleMount = (ed: Editor): void => {
    const save = (): void => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const { document } = getSnapshot(store)
        void window.api.canvas.write(id, document)
      }, 500)
    }
    unlistenRef.current = ed.store.listen(save, {
      scope: 'document',
      source: 'user'
    })
    useApp.getState().registerNoteIdPatcher((oldId, newId) => {
      for (const shape of ed.getCurrentPageShapes()) {
        if (shape.type === 'note-link') {
          const nl = shape as NoteLinkShape
          if (nl.props.noteId === oldId) {
            ed.updateShape({ id: nl.id, type: 'note-link', props: { ...nl.props, noteId: newId } })
          }
        } else if ((shape.meta?.noteId as string | undefined) === oldId) {
          ed.updateShape({ id: shape.id, type: shape.type, meta: { ...shape.meta, noteId: newId } })
        }
      }
    })
    setEditor(ed)
  }

  if (!ready) {
    return <div className="canvas-status">Loading canvas...</div>
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-header">
        {editor && <CanvasToolbar canvasId={id} editor={editor} />}
      </div>
      <div className="canvas-body">
        <Tldraw
          store={store}
          shapeUtils={customShapeUtils}
          assetUrls={assetUrls}
          onMount={handleMount}
          components={tlComponents}
        />
      </div>
      {editor && <CanvasContextBar editor={editor} />}
    </div>
  )
}

export function CanvasView(): React.ReactElement {
  const activeCanvasId = useApp((s) => s.activeCanvasId)

  if (!activeCanvasId) {
    return (
      <div className="canvas-status">
        <div>
          <h2>No canvas selected</h2>
          <p>Create a canvas from the sidebar to start building your graph.</p>
        </div>
      </div>
    )
  }

  // Keying by canvas id remounts the instance (fresh store) when navigating.
  return <CanvasInstance key={activeCanvasId} id={activeCanvasId} />
}
