<script setup lang="ts">
import { useDesktopVolumeStore } from '@owdproject/core/runtime/stores/storeDesktopVolume'
import { ref, watch } from '@vue/reactivity'
import { useDebounceFn } from '@vueuse/core'

const desktopVolumeStore = useDesktopVolumeStore()

const volume = ref(desktopVolumeStore.master)

const saveMasterVolumeDebounced = useDebounceFn(
  () => desktopVolumeStore.setMasterVolume(volume.value),
  250,
)

watch(
  () => volume.value,
  (value) => {
    saveMasterVolumeDebounced()
  },
)
</script>

<template>
  <SystemBarSettingsMenuSlider icon-prepend="mdi:headset">
    <Slider v-model="volume" :min="0" :max="100" />
  </SystemBarSettingsMenuSlider>
</template>

<style scoped lang="scss">
.owd-system-bar__settings-menu__header {
  display: flex;
  flex-direction: row;
  width: 100%;

  > div {
    &:nth-child(1) {
      text-align: left;
      flex: 1;
    }
    &:nth-child(2) {
      display: flex;
      flex-direction: row;
      gap: 12px;
      flex: 0;
    }
  }
}
</style>
