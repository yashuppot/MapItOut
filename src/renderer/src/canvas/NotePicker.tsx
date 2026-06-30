import { useEffect, useRef, useState } from 'react'
import type { VaultEntryMeta } from '../../../shared/types'

interface NotePickerProps {
  notes: VaultEntryMeta[]
  /** Currently selected noteId — pass '' or undefined for "none". */
  value?: string
  placeholder: string
  onSelect: (noteId: string) => void
  disabled?: boolean
  direction?: 'up' | 'down'
}

/** Score query against target using subsequence matching. Returns null if no match. */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return 1000 - t.indexOf(q)  // exact substring wins
  let qi = 0
  let score = 0
  let run = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      run++
      score += run * 2
    } else {
      run = 0
    }
  }
  return qi === q.length ? score - t.length : null
}

export function NotePicker({
  notes,
  value,
  placeholder,
  onSelect,
  disabled,
  direction = 'down'
}: NotePickerProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? notes
        .map((n) => ({ n, score: fuzzyScore(query, n.title) }))
        .filter((x): x is { n: VaultEntryMeta; score: number } => x.score !== null)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.n)
    : notes

  const currentTitle = value ? notes.find((n) => n.id === value)?.title : undefined

  const pick = (noteId: string): void => {
    onSelect(noteId)
    setOpen(false)
    setQuery('')
    setHighlighted(0)
  }

  const handleOpen = (): void => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setHighlighted(0)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlighted(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) pick(filtered[highlighted].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="note-picker" ref={rootRef}>
      <button
        className="toolbar-select note-picker-trigger"
        onClick={handleOpen}
        disabled={disabled}
        title={placeholder}
        type="button"
      >
        {currentTitle ?? placeholder}
      </button>
      {open && (
        <div className={`note-picker-dropdown${direction === 'up' ? ' note-picker-dropdown--up' : ''}`}>
          <input
            ref={inputRef}
            className="note-picker-search"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <ul className="note-picker-list">
            {filtered.length === 0 && (
              <li className="note-picker-empty">No matches</li>
            )}
            {filtered.map((n, i) => (
              <li
                key={n.id}
                className={`note-picker-item${i === highlighted ? ' highlighted' : ''}`}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(n.id) }}
              >
                {n.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
