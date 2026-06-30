import { app, dialog } from 'electron'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { randomUUID } from 'crypto'
import type {
  CanvasSnapshot,
  VaultEntryMeta,
  VaultIndex,
  VaultInfo
} from '../shared/types'

const CONFIG_FILE = () => join(app.getPath('userData'), 'pkm-config.json')

// All app-specific data lives in pkm_canvas/ — one folder to export for portability.
const PKM_DIR = 'pkm_canvas'
const CANVASES_SUBDIR = join(PKM_DIR, 'canvases')
const ASSETS_SUBDIR = join(PKM_DIR, 'assets')
const INDEX_FILE = (vault: string) => join(vault, PKM_DIR, 'index.json')

let currentVault: string | null = null

interface AppConfig {
  lastVaultPath?: string
}

interface CanvasIndex {
  canvases: VaultEntryMeta[]
}

async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE(), 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch {
    return {}
  }
}

async function writeConfig(config: AppConfig): Promise<void> {
  await fs.writeFile(CONFIG_FILE(), JSON.stringify(config, null, 2), 'utf-8')
}

async function readCanvasIndex(vault: string): Promise<CanvasIndex> {
  try {
    const raw = await fs.readFile(INDEX_FILE(vault), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<CanvasIndex>
    return { canvases: parsed.canvases ?? [] }
  } catch {
    return { canvases: [] }
  }
}

async function writeCanvasIndex(vault: string, index: CanvasIndex): Promise<void> {
  await fs.writeFile(INDEX_FILE(vault), JSON.stringify(index, null, 2), 'utf-8')
}

function requireVault(): string {
  if (!currentVault) throw new Error('No vault is currently open.')
  return currentVault
}

function info(vault: string | null): VaultInfo {
  return { path: vault, name: vault ? basename(vault) : null }
}

function sanitizeFilename(raw: string): string {
  const s = raw.replace(/[\\/:*?"<>|]/g, '').trim()
  return s || 'Untitled'
}

async function uniqueNoteName(vault: string, base: string): Promise<string> {
  if (!existsSync(join(vault, `${base}.md`))) return base
  let n = 1
  while (existsSync(join(vault, `${base} ${n}.md`))) n++
  return `${base} ${n}`
}

async function ensureStructure(vault: string): Promise<void> {
  await fs.mkdir(join(vault, CANVASES_SUBDIR), { recursive: true })
  await fs.mkdir(join(vault, ASSETS_SUBDIR), { recursive: true })
  if (!existsSync(INDEX_FILE(vault))) {
    await writeCanvasIndex(vault, { canvases: [] })
  }
}

/** Resolve an asset filename to its absolute path inside the current vault. */
export function resolveAssetPath(fileName: string): string | null {
  if (!currentVault) return null
  return join(currentVault, ASSETS_SUBDIR, basename(fileName))
}

export async function restoreLastVault(): Promise<VaultInfo> {
  const config = await readConfig()
  if (config.lastVaultPath && existsSync(config.lastVaultPath)) {
    currentVault = config.lastVaultPath
    await ensureStructure(currentVault)
  }
  return info(currentVault)
}

export async function chooseVault(): Promise<VaultInfo> {
  const result = await dialog.showOpenDialog({
    title: 'Choose or create a vault folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use this folder'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return info(currentVault)
  }
  currentVault = result.filePaths[0]
  await ensureStructure(currentVault)
  await writeConfig({ lastVaultPath: currentVault })
  return info(currentVault)
}

export function currentVaultInfo(): VaultInfo {
  return info(currentVault)
}

export async function getIndex(): Promise<VaultIndex> {
  const vault = requireVault()
  const canvasIndex = await readCanvasIndex(vault)
  const notes: VaultEntryMeta[] = []

  try {
    const entries = await fs.readdir(vault, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const id = entry.name
      const title = entry.name.slice(0, -3) // filename without .md is the display title
      const stat = await fs.stat(join(vault, entry.name))
      notes.push({
        id,
        title,
        createdAt: Math.round(stat.birthtimeMs),
        updatedAt: Math.round(stat.mtimeMs)
      })
    }
  } catch { /* readdir failed; return empty notes */ }

  return { canvases: canvasIndex.canvases, notes }
}

// ----- Canvases -----

export async function readCanvas(id: string): Promise<CanvasSnapshot | null> {
  const vault = requireVault()
  try {
    const raw = await fs.readFile(join(vault, CANVASES_SUBDIR, `${id}.json`), 'utf-8')
    return JSON.parse(raw) as CanvasSnapshot
  } catch {
    return null
  }
}

export async function writeCanvas(id: string, snapshot: CanvasSnapshot): Promise<void> {
  const vault = requireVault()
  await fs.writeFile(join(vault, CANVASES_SUBDIR, `${id}.json`), JSON.stringify(snapshot), 'utf-8')
  const index = await readCanvasIndex(vault)
  const entry = index.canvases.find((c) => c.id === id)
  if (entry) {
    entry.updatedAt = Date.now()
    await writeCanvasIndex(vault, index)
  }
}

export async function createCanvas(title: string): Promise<VaultEntryMeta> {
  const vault = requireVault()
  const now = Date.now()
  const meta: VaultEntryMeta = {
    id: randomUUID(),
    title: title.trim() || 'Untitled canvas',
    createdAt: now,
    updatedAt: now
  }
  const index = await readCanvasIndex(vault)
  index.canvases.push(meta)
  await writeCanvasIndex(vault, index)
  await fs.writeFile(
    join(vault, CANVASES_SUBDIR, `${meta.id}.json`),
    JSON.stringify(null),
    'utf-8'
  )
  return meta
}

export async function renameCanvas(id: string, title: string): Promise<void> {
  const vault = requireVault()
  const index = await readCanvasIndex(vault)
  const entry = index.canvases.find((c) => c.id === id)
  if (entry) {
    entry.title = title.trim() || entry.title
    entry.updatedAt = Date.now()
    await writeCanvasIndex(vault, index)
  }
}

// ----- Notes -----

export async function readNote(id: string): Promise<string> {
  const vault = requireVault()
  try {
    return await fs.readFile(join(vault, id), 'utf-8')
  } catch {
    return ''
  }
}

export async function writeNote(id: string, markdown: string): Promise<void> {
  const vault = requireVault()
  await fs.writeFile(join(vault, id), markdown, 'utf-8')
}

export async function createNote(title: string): Promise<VaultEntryMeta> {
  const vault = requireVault()
  const base = await uniqueNoteName(vault, sanitizeFilename(title))
  const id = `${base}.md`
  const now = Date.now()
  await fs.writeFile(join(vault, id), `# ${base}\n\n`, 'utf-8')
  return { id, title: base, createdAt: now, updatedAt: now }
}

/** Renames the note file on disk and patches canvas JSON references. Returns the new ID. */
export async function renameNote(id: string, newTitle: string): Promise<string> {
  const vault = requireVault()
  const newBase = await uniqueNoteName(vault, sanitizeFilename(newTitle))
  const newId = `${newBase}.md`
  if (newId === id) return id

  await fs.rename(join(vault, id), join(vault, newId))

  // Patch any canvas shapes that reference the old noteId.
  try {
    const canvasFiles = await fs.readdir(join(vault, CANVASES_SUBDIR))
    for (const file of canvasFiles) {
      if (!file.endsWith('.json')) continue
      const filePath = join(vault, CANVASES_SUBDIR, file)
      let content = await fs.readFile(filePath, 'utf-8')
      const oldPattern = `"noteId":"${id}"`
      if (content.includes(oldPattern)) {
        content = content.replaceAll(oldPattern, `"noteId":"${newId}"`)
        await fs.writeFile(filePath, content, 'utf-8')
      }
    }
  } catch { /* non-fatal */ }

  return newId
}

// ----- Assets -----

export async function writeAsset(bytes: ArrayBuffer, ext: string): Promise<string> {
  const vault = requireVault()
  const cleanExt = (ext || '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const fileName = `${randomUUID()}.${cleanExt}`
  await fs.writeFile(join(vault, ASSETS_SUBDIR, fileName), Buffer.from(bytes))
  return fileName
}

export function extOf(fileName: string): string {
  return extname(fileName).replace('.', '')
}
