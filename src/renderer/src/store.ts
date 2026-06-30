import { create } from 'zustand'
import type { VaultEntryMeta, VaultIndex, VaultInfo } from '../../shared/types'

interface AppState {
  vault: VaultInfo
  index: VaultIndex
  activeCanvasId: string | null
  openNoteId: string | null
  ready: boolean

  init: () => Promise<void>
  chooseVault: () => Promise<void>
  refreshIndex: () => Promise<void>

  createCanvas: (title: string) => Promise<VaultEntryMeta>
  openCanvas: (id: string) => void
  renameCanvas: (id: string, title: string) => Promise<void>

  createNote: (title: string) => Promise<VaultEntryMeta>
  openNote: (id: string) => void
  closeNote: () => void
  renameNote: (id: string, title: string) => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  vault: { path: null, name: null },
  index: { canvases: [], notes: [] },
  activeCanvasId: null,
  openNoteId: null,
  ready: false,

  init: async () => {
    const vault = await window.api.vault.current()
    if (vault.path) {
      const index = await window.api.vault.index()
      set({
        vault,
        index,
        activeCanvasId: index.canvases[0]?.id ?? null,
        ready: true
      })
    } else {
      set({ vault, ready: true })
    }
    // Refresh the index whenever the window regains focus so that .md files
    // dropped into the vault folder appear automatically.
    window.addEventListener('focus', () => { void get().refreshIndex() })
  },

  chooseVault: async () => {
    const vault = await window.api.vault.choose()
    if (!vault.path) return
    const index = await window.api.vault.index()
    set({
      vault,
      index,
      activeCanvasId: index.canvases[0]?.id ?? null,
      openNoteId: null
    })
  },

  refreshIndex: async () => {
    if (!get().vault.path) return
    const index = await window.api.vault.index()
    set({ index })
  },

  createCanvas: async (title: string) => {
    const meta = await window.api.canvas.create(title)
    await get().refreshIndex()
    set({ activeCanvasId: meta.id })
    return meta
  },

  openCanvas: (id: string) => {
    set({ activeCanvasId: id })
  },

  renameCanvas: async (id: string, title: string) => {
    await window.api.canvas.rename(id, title)
    await get().refreshIndex()
  },

  createNote: async (title: string) => {
    const meta = await window.api.note.create(title)
    await get().refreshIndex()
    set({ openNoteId: meta.id })
    return meta
  },

  openNote: (id: string) => {
    set({ openNoteId: id })
  },

  closeNote: () => {
    set({ openNoteId: null })
  },

  renameNote: async (id: string, title: string) => {
    const newId = await window.api.note.rename(id, title)
    if (get().openNoteId === id) set({ openNoteId: newId })
    await get().refreshIndex()
  }
}))
