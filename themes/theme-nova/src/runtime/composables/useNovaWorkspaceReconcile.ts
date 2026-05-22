import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

/** Assign windows on unknown/empty workspaces to the active desktop after persist restore. */
export function useNovaWorkspaceReconcile() {
  const applicationManager = useApplicationManager()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  function reconcileOrphanWindows() {
    desktopWorkspaceStore.setupWorkspaces()
    const activeId = desktopWorkspaceStore.resolveActiveWorkspaceId()
    if (!activeId) return

    const list = desktopWorkspaceStore.list

    for (const app of applicationManager.apps.values()) {
      for (const win of app.windows.values()) {
        const ws = win.state.workspace
        if (!ws || !list.includes(ws)) {
          win.actions.setWorkspace(activeId)
        }
      }
    }
  }

  return { reconcileOrphanWindows }
}
