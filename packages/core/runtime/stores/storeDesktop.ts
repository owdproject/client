import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DesktopWindowSurface = 'acrylic' | 'solid'

export type DesktopAppearance = 'dark' | 'light'

export type DesktopPersonalization = {
  windowSurface: DesktopWindowSurface
  /** Used when windowSurface is solid (CSS color string). */
  windowTint: string
  appearance: DesktopAppearance
}

export const defaultDesktopPersonalization: DesktopPersonalization = {
  windowSurface: 'acrylic',
  windowTint: '#2d2d30',
  appearance: 'dark',
}

export function mergePersonalization(
  raw: Partial<DesktopPersonalization> | undefined | null,
): DesktopPersonalization {
  const windowSurface =
    raw?.windowSurface === 'solid' || raw?.windowSurface === 'acrylic'
      ? raw.windowSurface
      : defaultDesktopPersonalization.windowSurface
  const appearance =
    raw?.appearance === 'light' || raw?.appearance === 'dark'
      ? raw.appearance
      : defaultDesktopPersonalization.appearance
  const tint =
    typeof raw?.windowTint === 'string' && raw.windowTint.trim()
      ? raw.windowTint.trim()
      : defaultDesktopPersonalization.windowTint
  return { windowSurface, windowTint: tint, appearance }
}

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
      explorer: {
        navExpandedKeys: string[]
        quickAccessPins: { id: string; label: string; path: string; icon?: string }[]
      }
      defaultApps: Record<string, { applicationId: string; entry: string }>
      personalization: DesktopPersonalization
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
      explorer: {
        navExpandedKeys: [
          'quickAccess',
          'thisPc',
        ],
        quickAccessPins: [],
      },
      defaultApps: {},
      personalization: { ...defaultDesktopPersonalization },
    })

    function setWindowSurface(value: DesktopWindowSurface) {
      const base = mergePersonalization(state.value.personalization)
      state.value.personalization = mergePersonalization({
        ...base,
        windowSurface: value,
      })
    }

    function setWindowTint(value: string) {
      const v = value.trim()
      if (!v) return
      const base = mergePersonalization(state.value.personalization)
      state.value.personalization = mergePersonalization({
        ...base,
        windowTint: v,
      })
    }

    function setAppearance(value: DesktopAppearance) {
      const base = mergePersonalization(state.value.personalization)
      state.value.personalization = mergePersonalization({
        ...base,
        appearance: value,
      })
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
