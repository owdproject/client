import type { Ref } from 'vue'
import type { ExplorerDropFsExplorer } from './useExplorerDropHandler'
import { useExplorerDropZone } from './useExplorerDropZone'

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
  return useExplorerDropZone({
    fsExplorer,
    dragDepth: true,
    stopPropagation: false,
    enabled: options.enabled,
  })
}
