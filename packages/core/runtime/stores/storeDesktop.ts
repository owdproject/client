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
      personalization: {
        windowSurface: 'acrylic' | 'solid'
        windowTint: string
        appearance: 'dark' | 'light'
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
      defaultApps: {},
      personalization: {
        windowSurface: 'acrylic',
        windowTint: '#2d2d30',
        appearance: 'dark',
      },
    })

    function setWindowSurface(value: 'acrylic' | 'solid') {
      state.value.personalization.windowSurface = value
    }

    function setWindowTint(value: string) {
      state.value.personalization.windowTint = value
    }

    function setAppearance(value: 'dark' | 'light') {
      state.value.personalization.appearance = value
    }

    return {
      state,
      setWindowSurface,
      setWindowTint,
      setAppearance,
    }
  },
  {
    // @ts-expect-error
    persistedState: {
      persist: true,
    },
  },
)
