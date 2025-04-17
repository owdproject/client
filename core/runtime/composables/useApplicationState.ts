import {defineStore} from "pinia"
import {ref} from "@vue/reactivity"

export const useApplicationState = (appId: string) => {
    return defineStore(`owd/application/${appId}`, () => {
        const meta: Ref<any> = ref({})

        const windows: Ref<{[windowId: string]: WindowStoredState}> = ref({})

        return {
            windows,
            meta,
        }
    }, {
        persistedState: {
            persist: true
        },
    })()
}
