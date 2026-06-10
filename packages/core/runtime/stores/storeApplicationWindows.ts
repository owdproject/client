import { defineStore } from 'pinia'
import { ref } from 'vue'
import { applicationWindowsStoreId } from './storeIds'

export const useApplicationWindowsStore = (appId: string) => {
  return defineStore(
    applicationWindowsStoreId(appId),
    () => {
      const windows: Ref<{ [windowId: string]: WindowStoredState }> = ref({})

      return {
        windows,
      }
    },
    {
      persistedState: {
        persist: true,
      },
    },
  )()
}
