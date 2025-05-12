export const useApplicationWindowsStore = (appId: string) => {
    return defineStore(`owd/application/${appId}/windows`, () => {
        const windows: Ref<{[windowId: string]: WindowStoredState}> = ref({})

        return {
            windows,
        }
    }, {
        persistedState: {
            persist: true
        },
    })()
}
