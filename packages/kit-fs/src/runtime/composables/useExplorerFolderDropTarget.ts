import type { Ref } from 'vue'
import type { ExplorerDropFsExplorer } from './useExplorerDropHandler'
import { useExplorerDropZone } from './useExplorerDropZone'

export type UseExplorerFolderDropTargetOptions = {
  fsExplorer: ExplorerDropFsExplorer
  folderPath: Ref<string> | (() => string)
  enabled?: Ref<boolean> | (() => boolean)
}

export function useExplorerFolderDropTarget(
  options: UseExplorerFolderDropTargetOptions,
) {
  return useExplorerDropZone({
    fsExplorer: options.fsExplorer,
    targetPath: options.folderPath,
    dragDepth: true,
    stopPropagation: true,
    enabled: options.enabled,
  })
}
