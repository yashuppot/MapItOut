import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    // The `?url` asset imports in @tldraw/assets/imports.vite are not understood
    // by esbuild's dep pre-bundler (they resolve to undefined). Let Vite's own
    // pipeline handle them instead.
    optimizeDeps: {
      exclude: ['@tldraw/assets']
    },
    plugins: [react()]
  }
})
