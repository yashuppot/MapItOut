# PKM Canvas

A local-first personal knowledge management app where an infinite canvas is the main feature. Draw and organise ideas on canvas, link canvas shapes to editable markdown notes, and connect canvases together — all stored as plain files in a vault folder you own.

## Features

- **Infinite canvas** — powered by tldraw; draw, sketch, and arrange ideas freely
- **Linked note cards** — place note cards on any canvas that open a full markdown editor
- **Canvas links** — link canvases together to build a network of ideas
- **Local-first storage** — everything lives as plain `.md` and `.json` files; no cloud, no database
- **Obsidian-compatible** — notes are `.md` files at the vault root, readable by Obsidian or any editor
- **Portable vault** — pick any folder; move or back it up like any other folder

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 42 + electron-vite |
| UI | React 19 + TypeScript |
| Canvas | tldraw 5 |
| State | Zustand |
| Markdown editor | @uiw/react-md-editor |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
npm install
npm run dev          # start Electron with hot reload
```

### Build

```bash
npm run build        # compile → out/
npm run start        # preview the compiled build
npm run typecheck    # run TypeScript checks (main + renderer)
```

## Vault Structure

When you open or create a vault, PKM Canvas uses the following layout:

```
<vault-folder>/
├── My Note.md              # your notes — plain markdown, at root level
├── Project Ideas.md
└── pkm_canvas/             # all app data lives here
    ├── index.json          # canvas metadata index
    ├── canvases/           # canvas snapshots (one JSON per canvas)
    │   └── <uuid>.json
    └── assets/             # images dropped onto canvases
        └── <uuid>.<ext>
```

Notes are named by you and live at the vault root, so any Obsidian vault or plain text tool can open them directly. The `pkm_canvas/` subfolder is the only non-note item.

## Project Structure

```
src/
├── main/          # Electron main process — window lifecycle, IPC handlers, vault file I/O
├── preload/       # Context-isolated IPC bridge (exposes window.api to renderer)
├── renderer/      # React app
│   └── src/
│       ├── canvas/      # CanvasView, CanvasToolbar, custom tldraw shapes
│       ├── components/  # Sidebar (canvas/note list, vault switcher)
│       ├── notes/       # NotePanel (markdown editor)
│       ├── store.ts     # Zustand state (active canvas, open note, vault index)
│       └── App.tsx      # Root component, welcome screen, main layout
└── shared/        # TypeScript types shared between main and renderer
```
