export const useWorkspaceStore = defineStore('owd/workspaces', () => {
    const active = ref<string>('')
    // @ts-ignore
    const list = ref<[string, ...string[]]>([])
    const overview = ref(false)

    function setupWorkspaces() {
        const applicationManager = useApplicationManager()

        if (list.value.length === 0) {
            createWorkspace()
            active.value = list.value[0]
        }

        if (list.value.length === 1) {
            createWorkspace()
        }
    }

    function setOverview(value: boolean) {
        overview.value = value
    }

    function setWorkspace(value: string) {
        active.value = value
    }

    function createWorkspace() {
        list.value.push(nanoid(8))
    }

    const workspaceActiveIndex = computed(() => {
        return list.value.findIndex(workspace => workspace === active.value)
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
}, {
    persist: {
        storage: window.localStorage,
    }
})