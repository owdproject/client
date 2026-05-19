import { collectExternalFilesFromDataTransfer } from '@owdproject/module-fs/runtime/utils/utilExternalFileImport'
import {
  hasExplorerDropPayload,
  isInternalVfsDrag,
  parseVfsPathsFromDataTransfer,
} from '../utils/explorerDnD'

export type ExplorerDropFsExplorer = {
  basePath: { value: string }
  fsController?: {
    importDroppedExternalFiles?: (
      entries: Awaited<ReturnType<typeof collectExternalFilesFromDataTransfer>>,
      targetDirectory?: string,
    ) => Promise<void>
    moveDroppedVfsPaths?: (paths: string[], targetDirectory?: string) => Promise<void>
  }
}

/** Resolve drop on listing zone or folder row into VFS import or internal move. */
export async function handleExplorerDrop(
  event: DragEvent,
  fsExplorer: ExplorerDropFsExplorer,
  targetDirectory: string,
): Promise<boolean> {
  if (!hasExplorerDropPayload(event)) return false

  event.preventDefault()
  event.stopPropagation()

  const dataTransfer = event.dataTransfer
  if (!dataTransfer) return false

  if (isInternalVfsDrag(event)) {
    const paths = parseVfsPathsFromDataTransfer(dataTransfer)
    if (paths?.length) {
      await fsExplorer.fsController?.moveDroppedVfsPaths?.(paths, targetDirectory)
      return true
    }
  }

  const entries = await collectExternalFilesFromDataTransfer(dataTransfer)
  if (entries.length) {
    await fsExplorer.fsController?.importDroppedExternalFiles?.(entries, targetDirectory)
    return true
  }

  return false
}
