import { useEventListener } from '@vueuse/core'
import { useApplicationManager } from './useApplicationManager'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'

/**
 * Keyboard + HTML5 drop handlers for workspace overview (move windows between desktops).
 */
export function useWorkspaceOverview() {
  const applicationManager = useApplicationManager()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (!desktopWorkspaceStore.overview) return
    desktopWorkspaceStore.setOverview(false)
  })

  function onWorkspaceDragOver(e: DragEvent) {
    if (!desktopWorkspaceStore.overview) return
    e.preventDefault()
  }

  function onWorkspaceDrop(e: DragEvent, workspaceId: string) {
    e.preventDefault()
    if (!desktopWorkspaceStore.overview) return

    const raw =
      e.dataTransfer?.getData('text/plain') ||
      e.dataTransfer?.getData('text') ||
      ''
    if (!raw) return

    const win = applicationManager.getWindowOpenedId(raw)
    win?.actions.setWorkspace(workspaceId)
  }

  return {
    onWorkspaceDragOver,
    onWorkspaceDrop,
  }
}
