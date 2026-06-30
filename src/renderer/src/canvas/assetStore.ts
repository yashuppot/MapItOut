import type { TLAsset, TLAssetStore } from 'tldraw'

const ASSET_PREFIX = 'asset:'

function extFromFile(file: File): string {
  const fromName = file.name.includes('.')
    ? file.name.split('.').pop() ?? ''
    : ''
  if (fromName) return fromName
  // Fall back to mime subtype, e.g. "image/png" -> "png".
  const fromType = file.type.split('/').pop() ?? ''
  return fromType || 'bin'
}

/**
 * Persists pasted/imported images as real files in the vault's `assets/`
 * folder (via IPC) and references them through the `app-asset://` protocol,
 * keeping canvas JSON small and the vault human-readable.
 *
 * tldraw's schema only allows http/https/data/asset URLs for `asset.props.src`,
 * so we store a schema-valid `asset:<filename>` URL and rewrite it to our
 * `app-asset://<filename>` protocol URL at render time inside `resolve`
 * (the value returned from `resolve` is not subject to schema validation).
 */
export const vaultAssetStore: TLAssetStore = {
  async upload(_asset: TLAsset, file: File): Promise<{ src: string }> {
    const fileName = await window.api.asset.write(
      await file.arrayBuffer(),
      extFromFile(file)
    )
    return { src: `${ASSET_PREFIX}${fileName}` }
  },

  resolve(asset: TLAsset): string | null {
    const src = (asset.props as { src?: string }).src
    if (!src) return null
    if (src.startsWith(ASSET_PREFIX)) {
      return `app-asset://${src.slice(ASSET_PREFIX.length)}`
    }
    // Already a usable URL (data:, http(s):, etc.).
    return src
  }
}
