import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDesktopStore } from './storeDesktop'

export const useDesktopVolumeStore = defineStore('owd/desktop/volume', () => {
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
