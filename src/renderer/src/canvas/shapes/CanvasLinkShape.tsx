import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLBaseShape
} from 'tldraw'
import { useApp } from '../../store'

export interface CanvasLinkProps {
  w: number
  h: number
  canvasId: string
  title: string
}

export type CanvasLinkShape = TLBaseShape<'canvas-link', CanvasLinkProps>

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'canvas-link': CanvasLinkProps
  }
}

export const CANVAS_LINK_DEFAULT_SIZE = { w: 220, h: 96 }

export class CanvasLinkShapeUtil extends BaseBoxShapeUtil<CanvasLinkShape> {
  static override type = 'canvas-link' as const

  static override props: RecordProps<CanvasLinkShape> = {
    w: T.number,
    h: T.number,
    canvasId: T.string,
    title: T.string
  }

  override getDefaultProps(): CanvasLinkProps {
    return {
      w: CANVAS_LINK_DEFAULT_SIZE.w,
      h: CANVAS_LINK_DEFAULT_SIZE.h,
      canvasId: '',
      title: 'Untitled canvas'
    }
  }

  override canEdit(): boolean {
    return false
  }

  override onDoubleClick(shape: CanvasLinkShape): void {
    if (shape.props.canvasId) {
      useApp.getState().openCanvas(shape.props.canvasId)
    }
  }

  override component(shape: CanvasLinkShape): React.ReactElement {
    return <CanvasLinkCard shape={shape} />
  }

  override getIndicatorPath(shape: CanvasLinkShape): Path2D {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10)
    return path
  }
}

function CanvasLinkCard({
  shape
}: {
  shape: CanvasLinkShape
}): React.ReactElement {
  const liveTitle = useApp((s) =>
    s.index.canvases.find((c) => c.id === shape.props.canvasId)?.title
  )
  const missing = !!shape.props.canvasId && liveTitle === undefined
  const title = liveTitle ?? shape.props.title ?? 'Untitled canvas'

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
        border: '1px solid #a9c6e0',
        background: 'linear-gradient(180deg, #eef6ff 0%, #d8eafc 100%)',
        color: '#1f3a52',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
      }}
      onDoubleClick={() => {
        if (shape.props.canvasId)
          useApp.getState().openCanvas(shape.props.canvasId)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{'\u{1F5BC}'}</span>
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
        {missing ? 'Canvas deleted' : 'Double-click to open canvas'}
      </span>
    </HTMLContainer>
  )
}
