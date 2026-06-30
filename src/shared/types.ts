export interface VaultEntryMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface VaultIndex {
  canvases: VaultEntryMeta[]
  notes: VaultEntryMeta[]
}

export interface VaultInfo {
  /** Absolute path to the vault folder, or null if none is open yet. */
  path: string | null
  /** Display name (folder basename), or null. */
  name: string | null
}

/**
 * The serialized tldraw document snapshot we persist per canvas.
 * Kept as `unknown` here to avoid coupling shared types to tldraw internals.
 */
export type CanvasSnapshot = unknown

export interface PkmApi {
  vault: {
    choose(): Promise<VaultInfo>
    current(): Promise<VaultInfo>
    index(): Promise<VaultIndex>
  }
  canvas: {
    read(id: string): Promise<CanvasSnapshot | null>
    write(id: string, snapshot: CanvasSnapshot): Promise<void>
    create(title: string): Promise<VaultEntryMeta>
    rename(id: string, title: string): Promise<void>
  }
  note: {
    read(id: string): Promise<string>
    write(id: string, markdown: string): Promise<void>
    create(title: string): Promise<VaultEntryMeta>
    rename(id: string, title: string): Promise<string>
  }
  asset: {
    /** Persists raw bytes to the vault and returns the bare asset filename. */
    write(bytes: ArrayBuffer, ext: string): Promise<string>
  }
}
