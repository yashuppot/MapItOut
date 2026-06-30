import { contextBridge, ipcRenderer } from 'electron'
import type {
  CanvasSnapshot,
  PkmApi,
  VaultEntryMeta,
  VaultIndex,
  VaultInfo
} from '../shared/types'

const api: PkmApi = {
  vault: {
    choose: (): Promise<VaultInfo> => ipcRenderer.invoke('vault:choose'),
    current: (): Promise<VaultInfo> => ipcRenderer.invoke('vault:current'),
    index: (): Promise<VaultIndex> => ipcRenderer.invoke('vault:index')
  },
  canvas: {
    read: (id): Promise<CanvasSnapshot | null> =>
      ipcRenderer.invoke('canvas:read', id),
    write: (id, snapshot): Promise<void> =>
      ipcRenderer.invoke('canvas:write', id, snapshot),
    create: (title): Promise<VaultEntryMeta> =>
      ipcRenderer.invoke('canvas:create', title),
    rename: (id, title): Promise<void> =>
      ipcRenderer.invoke('canvas:rename', id, title)
  },
  note: {
    read: (id): Promise<string> => ipcRenderer.invoke('note:read', id),
    write: (id, markdown): Promise<void> =>
      ipcRenderer.invoke('note:write', id, markdown),
    create: (title): Promise<VaultEntryMeta> =>
      ipcRenderer.invoke('note:create', title),
    rename: (id, title): Promise<string> =>
      ipcRenderer.invoke('note:rename', id, title)
  },
  asset: {
    write: (bytes, ext): Promise<string> =>
      ipcRenderer.invoke('asset:write', bytes, ext)
  }
}

contextBridge.exposeInMainWorld('api', api)
