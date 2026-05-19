import { ref, type Ref } from 'vue'
import { hasExplorerDropPayload, OWD_VFS_PATHS_MIME } from '../utils/explorerDnD'
import {
  handleExplorerDrop,
  type ExplorerDropFsExplorer,
} from './useExplorerDropHandler'

export type UseExplorerExternalDropOptions = {
  /** When false, drag-over is ignored (e.g. web URL panes). Default: true. */
  enabled?: Ref<boolean> | (() => boolean)
}

/**
 * Theme-agnostic HTML5 drop handling for explorer listing areas.
 * Themes mount {@link KitFsExplorerSelectableArea} (or call these handlers on their shell).
 */
export function useExplorerExternalDrop(
  fsExplorer: ExplorerDropFsExplorer,
  options: UseExplorerExternalDropOptions = {},
) {
  const isDragOver = ref(false)
  let dragDepth = 0

  function isEnabled() {
    const enabled = options.enabled
    if (typeof enabled === 'function') return enabled()
    return enabled?.value ?? true
  }

  function onDragEnter(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    dragDepth += 1
    isDragOver.value = true
  }

  function onDragOver(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes(
        OWD_VFS_PATHS_MIME,
      )
        ? 'move'
        : 'copy'
    }
    isDragOver.value = true
  }

  function onDragLeave(event: DragEvent) {
    if (!isEnabled()) return

    event.preventDefault()
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) {
      isDragOver.value = false
    }
  }

  async function onDrop(event: DragEvent) {
    if (!isEnabled()) return

    dragDepth = 0
    isDragOver.value = false

    await handleExplorerDrop(
      event,
      fsExplorer,
      fsExplorer.basePath.value,
    )
  }

  return {
    isDragOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
