import {defineStore} from "pinia"

export const useApplicationMetaStore = (appId: string, states: any = {}) => {
    return defineStore(`owd/application/${appId}/meta`, () => {
        return states
    }, {
        persistedState: {
            persist: true
        },
    })
}
