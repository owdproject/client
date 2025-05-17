import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDesktopStore = defineStore(
  'owd/desktop',
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
