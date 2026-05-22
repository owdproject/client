import type { Ref } from 'vue'
import { setVfsPathsOnDataTransfer } from '../utils/explorerDnD'

export type ExplorerInternalDragOptions = {
  entryPath: Ref<string> | (() => string)
  selectedFiles: Ref<string[]> | (() => string[])
  dragEnabled?: Ref<boolean> | (() => boolean)
}

export function useExplorerInternalDrag(options: ExplorerInternalDragOptions) {
  function resolveEntryPath() {
    return typeof options.entryPath === 'function'
      ? options.entryPath()
      : options.entryPath.value
  }

  function resolveSelectedFiles() {
    return typeof options.selectedFiles === 'function'
      ? options.selectedFiles()
      : options.selectedFiles.value
  }

  function isEnabled() {
    const enabled = options.dragEnabled
    if (typeof enabled === 'function') return enabled()
    return enabled?.value ?? true
  }

  function onDragStart(event: DragEvent) {
    if (!isEnabled()) return

    const dataTransfer = event.dataTransfer
    if (!dataTransfer) return

    const entryPath = resolveEntryPath()
    const selectedFiles = resolveSelectedFiles()
    const paths = selectedFiles.includes(entryPath)
      ? [...selectedFiles]
      : [entryPath]

    setVfsPathsOnDataTransfer(dataTransfer, paths)
  }

  return {
    onDragStart,
  }
}
