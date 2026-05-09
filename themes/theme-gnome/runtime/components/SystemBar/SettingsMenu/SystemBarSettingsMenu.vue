<script setup>
import { useSettingsMenu } from '../../../composables/useSettingsMenu'
import { useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const settingsMenu = useSettingsMenu()
const settingsMenuElement = useTemplateRef('settingsMenuElement')

onClickOutside(settingsMenuElement, () => (settingsMenu.enabled.value = false))
</script>

<template>
  <div ref="settingsMenuElement">
    <SystemBarButton
      @click="settingsMenu.enabled.value = !settingsMenu.enabled.value"
    >
      <Icon name="lucide:wifi" :size="18" style="vertical-align: -3px" />
    </SystemBarButton>

    <SystemBarMenu
      v-if="settingsMenu.enabled.value"
      class="owd-system-bar__settings-menu"
    >
      <SystemBarSettingsMenuHeader style="margin-bottom: 16px" />
      <SystemBarSettingsMenuVolume />
    </SystemBarMenu>
  </div>
</template>

<style lang="scss" scoped>
.owd-system-bar__settings-menu {
  right: var(--p-system-bar-menu-spacing);
  min-height: 200px;
  width: 400px;
  padding: 16px;
  border-radius: 36px !important;
}
</style>
