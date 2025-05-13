import {defineStore} from "pinia"
import {computed} from "vue"
import {useDesktopStore} from "./storeDesktop"
import {nanoid} from "nanoid";

export const useDesktopWorkspaceStore = defineStore('owd/desktop/workspace', () => {
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
            desktopStore.state.workspace.active = desktopStore.state.workspace.list[0] as string
        }

        if (desktopStore.state.workspace.list.length === 1) {
            createWorkspace()
        }
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
            workspace => workspace === desktopStore.state.workspace.active
        )
    })

    return {
        active,
        overview,
        list,
        workspaceActiveIndex,
        setupWorkspaces,
        setOverview,
        setWorkspace,
    }
})
