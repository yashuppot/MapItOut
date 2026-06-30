import type { PkmApi } from '../shared/types'

declare global {
  interface Window {
    api: PkmApi
  }
}

export {}
