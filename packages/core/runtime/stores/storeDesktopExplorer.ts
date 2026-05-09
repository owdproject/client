import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDesktopStore } from './storeDesktop'

type ExplorerQuickAccessPin = {
  id: string
  label: string
  path: string
  icon?: string
}

export const useDesktopExplorerStore = defineStore(
  'owd/desktop/explorer',
  () => {
    const desktopStore = useDesktopStore()

    const navExpandedKeys = computed(
      () => desktopStore.state.explorer.navExpandedKeys,
    )
    const quickAccessPins = computed(
      () => desktopStore.state.explorer.quickAccessPins,
    )

    function setNavExpandedKeys(keys: string[]) {
      desktopStore.state.explorer.navExpandedKeys = [...new Set(keys)]
    }

    function setQuickAccessPins(pins: ExplorerQuickAccessPin[]) {
      desktopStore.state.explorer.quickAccessPins = pins
    }

    function pinQuickAccess(entry: ExplorerQuickAccessPin) {
      const exists = desktopStore.state.explorer.quickAccessPins.some(
        (pin) => pin.path === entry.path,
      )
      if (exists) return
      desktopStore.state.explorer.quickAccessPins.push(entry)
    }

    function unpinQuickAccess(path: string) {
      desktopStore.state.explorer.quickAccessPins =
        desktopStore.state.explorer.quickAccessPins.filter(
          (pin) => pin.path !== path,
        )
    }

    function reorderQuickAccess(startIndex: number, endIndex: number) {
      const list = [...desktopStore.state.explorer.quickAccessPins]
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
      desktopStore.state.explorer.quickAccessPins = list
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
)
