import type { DesktopWorkAreaRect } from '@owdproject/core'
import { defineStore } from 'pinia'
import { computed, readonly, shallowRef } from 'vue'
import { useDesktopStore } from './storeDesktop'
import { DESKTOP_WINDOW_STORE_ID } from './storeIds'

export const EMPTY_DESKTOP_WORK_AREA: DesktopWorkAreaRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

export const useDesktopWindowStore = defineStore(DESKTOP_WINDOW_STORE_ID, () => {
  const desktopStore = useDesktopStore()
  const workArea = shallowRef<DesktopWorkAreaRect>({
    ...EMPTY_DESKTOP_WORK_AREA,
  })

  const positionZ = computed(() => desktopStore.state.window.positionZ)

  function incrementPositionZ() {
    desktopStore.state.window.positionZ++

    return desktopStore.state.window.positionZ
  }

  function setWorkArea(rect: DesktopWorkAreaRect) {
    workArea.value = { ...rect }
  }

  return {
    positionZ,
    incrementPositionZ,
    workArea: readonly(workArea),
    setWorkArea,
  }
})
