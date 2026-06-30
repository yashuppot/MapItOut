import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLBaseShape
} from 'tldraw'
import { useApp } from '../../store'

export interface NoteLinkProps {
  w: number
  h: number
  noteId: string
  title: string
}

export type NoteLinkShape = TLBaseShape<'note-link', NoteLinkProps>

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'note-link': NoteLinkProps
  }
}

export const NOTE_LINK_DEFAULT_SIZE = { w: 220, h: 96 }

export class NoteLinkShapeUtil extends BaseBoxShapeUtil<NoteLinkShape> {
  static override type = 'note-link' as const

  static override props: RecordProps<NoteLinkShape> = {
    w: T.number,
    h: T.number,
    noteId: T.string,
    title: T.string
  }

  override getDefaultProps(): NoteLinkProps {
    return {
      w: NOTE_LINK_DEFAULT_SIZE.w,
      h: NOTE_LINK_DEFAULT_SIZE.h,
      noteId: '',
      title: 'Untitled note'
    }
  }

  override canEdit(): boolean {
    return false
  }

  override onDoubleClick(shape: NoteLinkShape): void {
    if (shape.props.noteId) {
      useApp.getState().openNote(shape.props.noteId)
    }
  }

  override component(shape: NoteLinkShape): React.ReactElement {
    return <NoteLinkCard shape={shape} />
  }

  override getIndicatorPath(shape: NoteLinkShape): Path2D {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10)
    return path
  }
}

function NoteLinkCard({ shape }: { shape: NoteLinkShape }): React.ReactElement {
  const missing = useApp(
    (s) => !!shape.props.noteId && !s.index.notes.find((n) => n.id === shape.props.noteId)
  )
  const title = shape.props.title || 'Untitled note'

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        pointerEvents: 'all',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        boxSizing: 'border-box',
        borderRadius: 10,
        border: '1px solid #d6c79a',
        background: 'linear-gradient(180deg, #fff9e6 0%, #fdf1c9 100%)',
        color: '#4a3f1a',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
      }}
      onDoubleClick={() => {
        if (shape.props.noteId) useApp.getState().openNote(shape.props.noteId)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{'\u{1F4DD}'}</span>
        <strong
          style={{
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </strong>
      </div>
      <span style={{ fontSize: 11, opacity: 0.7 }}>
        {missing ? 'Note deleted' : 'Double-click to open note'}
      </span>
    </HTMLContainer>
  )
}
