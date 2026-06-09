import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDesktopStore } from './storeDesktop'
import { nanoid } from 'nanoid'

export const useDesktopWorkspaceStore = defineStore(
  'owd/desktop/workspace',
  () => {
    const desktopStore = useDesktopStore()

    const active = computed(() => {
      return desktopStore.state.workspace.active
    })

    const overview = computed(() => {
      return desktopStore.state.workspace.overview
    })

    const list = computed(() => {
      return desktopStore.state.workspace.list
    })

    function setupWorkspaces() {
      if (desktopStore.state.workspace.list.length === 0) {
        createWorkspace()
      }

      if (desktopStore.state.workspace.list.length === 1) {
        createWorkspace()
      }

      const list = desktopStore.state.workspace.list
      const active = desktopStore.state.workspace.active
      if (!active || !list.includes(active)) {
        desktopStore.state.workspace.active = list[0] ?? ''
      }
    }

    /** Id of the workspace new windows should use (after setupWorkspaces). */
    function resolveActiveWorkspaceId(): string {
      setupWorkspaces()
      return desktopStore.state.workspace.active || desktopStore.state.workspace.list[0] || ''
    }

    function setOverview(value: boolean) {
      desktopStore.state.workspace.overview = value
    }

    function setWorkspace(value: string) {
      desktopStore.state.workspace.active = value
    }

    function createWorkspace() {
      desktopStore.state.workspace.list.push(nanoid(8))
    }

    /** Last workspace in list excluding the given id (window migration target). */
    function resolveWorkspaceFallback(workspaceId: string): string | null {
      const remaining = desktopStore.state.workspace.list.filter(
        (id) => id !== workspaceId,
      )
      return remaining.at(-1) ?? null
    }

    function removeWorkspace(workspaceId: string): boolean {
      const list = desktopStore.state.workspace.list
      if (list.length <= 2) return false

      const index = list.indexOf(workspaceId)
      if (index === -1) return false

      const fallbackId = resolveWorkspaceFallback(workspaceId)
      if (!fallbackId) return false

      list.splice(index, 1)

      if (desktopStore.state.workspace.active === workspaceId) {
        desktopStore.state.workspace.active = fallbackId
      }

      return true
    }

    const workspaceActiveIndex = computed(() => {
      return desktopStore.state.workspace.list.findIndex(
        (workspace) => workspace === desktopStore.state.workspace.active,
      )
    })

    return {
      active,
      overview,
      list,
      workspaceActiveIndex,
      setupWorkspaces,
      resolveActiveWorkspaceId,
      setOverview,
      setWorkspace,
      createWorkspace,
      resolveWorkspaceFallback,
      removeWorkspace,
    }
  },
)
