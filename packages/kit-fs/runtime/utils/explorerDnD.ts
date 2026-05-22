export const OWD_VFS_PATHS_MIME = 'application/x-owd-vfs-paths'

export {
  isInvalidMoveTarget,
  normalizeZenfsPath,
} from '@owdproject/module-fs/runtime/utils/utilExplorerMove'

export function parseVfsPathsFromDataTransfer(
  dataTransfer: DataTransfer,
): string[] | null {
  const raw = dataTransfer.getData(OWD_VFS_PATHS_MIME)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
  } catch {
    return null
  }
}

export function setVfsPathsOnDataTransfer(
  dataTransfer: DataTransfer,
  paths: string[],
): void {
  dataTransfer.setData(OWD_VFS_PATHS_MIME, JSON.stringify(paths))
  dataTransfer.effectAllowed = 'move'
}

export function hasExplorerDropPayload(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false

  return (
    types.includes('Files')
    || types.includes('application/x-moz-file')
    || types.includes('text/uri-list')
    || types.includes(OWD_VFS_PATHS_MIME)
  )
}

export function isInternalVfsDrag(event: DragEvent): boolean {
  return Boolean(event.dataTransfer?.types.includes(OWD_VFS_PATHS_MIME))
}
