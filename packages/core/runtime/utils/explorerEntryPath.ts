/**
 * Absolute path for a listing entry under `basePath` (virtual FS paths).
 * Avoids `//fileName` when `basePath` is `/` or has trailing slashes.
 */
export function explorerEntryAbsolutePath(basePath: string, fileName: string): string {
  const normalizedBase = (basePath ?? '/').replace(/\/+$/, '') || '/'
  const tail = fileName.replace(/^\/+/, '')
  if (normalizedBase === '/') return `/${tail}`
  return `${normalizedBase}/${tail}`
}
