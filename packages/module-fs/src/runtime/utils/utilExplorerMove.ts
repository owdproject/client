export function normalizeZenfsPath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

/** True when `targetDirectory` is the same path or nested inside `sourcePath`. */
export function isInvalidMoveTarget(
  sourcePath: string,
  targetDirectory: string,
): boolean {
  const source = normalizeZenfsPath(sourcePath)
  const target = normalizeZenfsPath(targetDirectory)

  if (source === target) return true
  return target.startsWith(`${source}/`)
}
