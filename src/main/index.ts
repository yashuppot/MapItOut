import { app, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import {
  chooseVault,
  createCanvas,
  createNote,
  currentVaultInfo,
  getIndex,
  readCanvas,
  readNote,
  renameCanvas,
  renameNote,
  resolveAssetPath,
  restoreLastVault,
  writeAsset,
  writeCanvas,
  writeNote
} from './vault'
import type { CanvasSnapshot } from '../shared/types'

// The custom protocol must be registered as privileged before the app is ready
// so it behaves like a standard, secure scheme (supports fetch, streaming, etc.).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1b1b1f',
    title: 'PKM Canvas',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    // In dev, surface renderer console output and load failures in the terminal.
    mainWindow.webContents.on('console-message', (event) => {
      console.log(`[renderer:${event.level}] ${event.message}`)
    })
    mainWindow.webContents.on(
      'did-fail-load',
      (_e, code, desc, url) => {
        console.error(`[renderer] failed to load ${url}: ${desc} (${code})`)
      }
    )
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerAssetProtocol(): void {
  protocol.handle('app-asset', async (request) => {
    // For a standard scheme, app-asset://<filename> parses the filename into
    // the host (with a trailing "/" path), so combine and strip to a basename.
    const url = new URL(request.url)
    const fileName = decodeURIComponent(url.hostname + url.pathname)
    const filePath = resolveAssetPath(fileName)
    if (!filePath) {
      return new Response('No vault open', { status: 404 })
    }
    try {
      const res = await net.fetch(pathToFileURL(filePath).toString())
      // The renderer origin (localhost in dev, file:// in prod) differs from the
      // app-asset origin, so allow cross-origin reads for <img> rendering.
      const headers = new Headers(res.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      return new Response(res.body, { status: res.status, headers })
    } catch {
      return new Response('Asset not found', { status: 404 })
    }
  })
}

function registerIpc(): void {
  ipcMain.handle('vault:choose', () => chooseVault())
  ipcMain.handle('vault:current', () => currentVaultInfo())
  ipcMain.handle('vault:index', () => getIndex())

  ipcMain.handle('canvas:read', (_e, id: string) => readCanvas(id))
  ipcMain.handle('canvas:write', (_e, id: string, snapshot: CanvasSnapshot) =>
    writeCanvas(id, snapshot)
  )
  ipcMain.handle('canvas:create', (_e, title: string) => createCanvas(title))
  ipcMain.handle('canvas:rename', (_e, id: string, title: string) =>
    renameCanvas(id, title)
  )

  ipcMain.handle('note:read', (_e, id: string) => readNote(id))
  ipcMain.handle('note:write', (_e, id: string, markdown: string) =>
    writeNote(id, markdown)
  )
  ipcMain.handle('note:create', (_e, title: string) => createNote(title))
  ipcMain.handle('note:rename', (_e, id: string, title: string) =>
    renameNote(id, title)
  )

  ipcMain.handle('asset:write', (_e, bytes: ArrayBuffer, ext: string) =>
    writeAsset(bytes, ext)
  )
}

app.whenReady().then(async () => {
  registerAssetProtocol()
  registerIpc()
  await restoreLastVault()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
