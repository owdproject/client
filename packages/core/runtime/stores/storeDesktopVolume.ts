import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDesktopStore } from './storeDesktop'
import { DESKTOP_VOLUME_STORE_ID } from './storeIds'

export const useDesktopVolumeStore = defineStore(DESKTOP_VOLUME_STORE_ID, () => {
  const desktopStore = useDesktopStore()

  const master = computed(() => desktopStore.state.volume.master)

  function setMasterVolume(value: number) {
    desktopStore.state.volume.master = value
  }

  return {
    master,
    setMasterVolume,
  }
})
