import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DESKTOP_STORE_ID } from './storeIds'

export const useDesktopStore = defineStore(
  DESKTOP_STORE_ID,
  () => {
    const state = ref<{
      workspace: {
        overview: boolean
        active: string
        list: string[]
      }
      volume: {
        master: number
      }
      window: {
        positionZ: number
      }
      defaultApps: Record<string, { applicationId: string; entry: string }>
    }>({
      workspace: {
        overview: false,
        active: '',
        list: [],
      },
      volume: {
        master: 100,
      },
      window: {
        positionZ: 0,
      },
      defaultApps: {},
    })

    return {
      state,
    }
  },
  {
    // @ts-expect-error
    persistedState: {
      persist: true,
    },
  },
)
