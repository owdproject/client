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
    }
  },
)
