import { ref, type Ref } from 'vue'
import {
  hasExplorerDropPayload,
  isInternalVfsDrag,
  OWD_VFS_PATHS_MIME,
} from '../utils/explorerDnD'
import {
  handleExplorerDrop,
  type ExplorerDropFsExplorer,
} from './useExplorerDropHandler'

export type UseExplorerDropZoneOptions = {
  fsExplorer: ExplorerDropFsExplorer
  /** Drop destination; defaults to `fsExplorer.basePath`. */
  targetPath?: Ref<string> | (() => string)
  /** Count nested enter/leave events for stable highlight. Default: true. */
  dragDepth?: boolean
  /** Stop propagation so parent listing zones do not also handle the drop. */
  stopPropagation?: boolean
  enabled?: Ref<boolean> | (() => boolean)
}

function resolveTargetPath(
  fsExplorer: ExplorerDropFsExplorer,
  targetPath: UseExplorerDropZoneOptions['targetPath'],
) {
  if (targetPath) {
    return typeof targetPath === 'function' ? targetPath() : targetPath.value
  }
  return fsExplorer.basePath.value
}

/**
 * Shared HTML5 drop-zone logic for explorer listing areas and folder rows.
 */
export function useExplorerDropZone(options: UseExplorerDropZoneOptions) {
  const isDragOver = ref(false)
  const useDragDepth = options.dragDepth ?? true
  let dragDepth = 0

  function isEnabled() {
    const enabled = options.enabled
    if (typeof enabled === 'function') return enabled()
    return enabled?.value ?? true
  }

  function maybeStopPropagation(event: DragEvent) {
    if (options.stopPropagation) {
      event.stopPropagation()
    }
  }

  function setDropEffect(event: DragEvent) {
    if (!event.dataTransfer) return

    event.dataTransfer.dropEffect =
      event.dataTransfer.types.includes(OWD_VFS_PATHS_MIME) ||
      isInternalVfsDrag(event)
        ? 'move'
        : 'copy'
  }

  function onDragEnter(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    maybeStopPropagation(event)

    if (useDragDepth) {
      dragDepth += 1
    }
    isDragOver.value = true
  }

  function onDragOver(event: DragEvent) {
    if (!isEnabled()) return
    if (!hasExplorerDropPayload(event)) return

    event.preventDefault()
    maybeStopPropagation(event)
    setDropEffect(event)
    isDragOver.value = true
  }

  function onDragLeave(event: DragEvent) {
    if (!isEnabled()) return

    event.preventDefault()
    maybeStopPropagation(event)

    if (useDragDepth) {
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) {
        isDragOver.value = false
      }
    } else {
      isDragOver.value = false
    }
  }

  async function onDrop(event: DragEvent) {
    if (!isEnabled()) return

    dragDepth = 0
    isDragOver.value = false

    await handleExplorerDrop(
      event,
      options.fsExplorer,
      resolveTargetPath(options.fsExplorer, options.targetPath),
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
