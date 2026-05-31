import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ExplorerQuickAccessPin = {
  id: string
  label: string
  path: string
  icon?: string
}

export const useExplorerStore = defineStore(
  'owd/kit-fs/explorer',
  () => {
    const navExpandedKeys = ref<string[]>(['quickAccess', 'thisPc'])
    const quickAccessPins = ref<ExplorerQuickAccessPin[]>([])

    function setNavExpandedKeys(keys: string[]) {
      navExpandedKeys.value = [...new Set(keys)]
    }

    function setQuickAccessPins(pins: ExplorerQuickAccessPin[]) {
      quickAccessPins.value = pins
    }

    function pinQuickAccess(entry: ExplorerQuickAccessPin) {
      const exists = quickAccessPins.value.some((pin) => pin.path === entry.path)
      if (exists) return
      quickAccessPins.value.push(entry)
    }

    function unpinQuickAccess(path: string) {
      quickAccessPins.value = quickAccessPins.value.filter(
        (pin) => pin.path !== path,
      )
    }

    function reorderQuickAccess(startIndex: number, endIndex: number) {
      const list = [...quickAccessPins.value]
      if (
        startIndex < 0 ||
        endIndex < 0 ||
        startIndex >= list.length ||
        endIndex >= list.length ||
        startIndex === endIndex
      ) {
        return
      }
      const [item] = list.splice(startIndex, 1)
      if (!item) return
      list.splice(endIndex, 0, item)
      quickAccessPins.value = list
    }

    return {
      navExpandedKeys,
      quickAccessPins,
      setNavExpandedKeys,
      setQuickAccessPins,
      pinQuickAccess,
      unpinQuickAccess,
      reorderQuickAccess,
    }
  },
  {
    // @ts-expect-error optional @owdproject/module-persistence
    persistedState: {
      persist: true,
    },
  },
)

/** @deprecated Use {@link useExplorerStore} */
export const useDesktopExplorerStore = useExplorerStore
