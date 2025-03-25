export const useApplicationState = (appId: string) => {
    return defineStore(`application/${appId}`, () => {
        const meta: Ref<any> = ref({})

        const windows: Ref<{[windowId: string]: WindowStoredState}> = ref({})

        return {
            windows,
            meta,
        }
    }, {
        persist: {
            storage: window.localStorage
        },
    })()
}
