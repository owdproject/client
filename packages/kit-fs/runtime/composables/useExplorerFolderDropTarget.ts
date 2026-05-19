import { ref, type Ref } from 'vue'
import {
  hasExplorerDropPayload,
  isInternalVfsDrag,
} from '../utils/explorerDnD'
import {
  handleExplorerDrop,
  type ExplorerDropFsExplorer,
} from './useExplorerDropHandler'

export type UseExplorerFolderDropTargetOptions = {
  fsExplorer: ExplorerDropFsExplorer
  folderPath: Ref<string> | (() => string)
  enabled?: Ref<boolean> | (() => boolean)
}

export function useExplorerFolderDropTarget(
  options: UseExplorerFolderDropTargetOptions,
) {
  const isDragOver = ref(false)

  function resolveFolderPath() {
    return typeof options.folderPath === 'function'
      ? options.folderPath()
      : options.folderPath.value
  }

  function isEnabled() {
    const enabled = options.enabled
    if (typeof enabled === 'function') return enabled()
    return enabled?.value ?? true
  }

  function onDragEnter(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    event.stopPropagation()
    isDragOver.value = true
  }

  function onDragOver(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isInternalVfsDrag(event) ? 'move' : 'copy'
    }

    isDragOver.value = true
  }

  function onDragLeave(event: DragEvent) {
    if (!isEnabled()) return

    event.preventDefault()
    event.stopPropagation()
    isDragOver.value = false
  }

  async function onDrop(event: DragEvent) {
    if (!isEnabled()) return

    isDragOver.value = false
    await handleExplorerDrop(event, options.fsExplorer, resolveFolderPath())
  }

  return {
    isDragOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
