<script setup lang="ts">
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import NovaStartButton from './NovaStartButton.vue'
import NovaStartMenu from './NovaStartMenu.vue'
import NovaTopBarTray from './NovaTopBarTray.vue'

const { systemBarEnabled, startButtonEnabled } = useDesktopShellOptions()
const { open: startMenuOpen, useFullscreenLauncher } = useNovaStartMenu()
</script>

<template>
  <header
    v-if="systemBarEnabled"
    class="nova-top-bar owd-desktop__system-bar"
  >
    <div class="nova-top-bar__start">
      <div v-if="startButtonEnabled" class="nova-top-bar__start-anchor">
        <NovaStartButton />
        <NovaStartMenu v-if="startMenuOpen && !useFullscreenLauncher" />
      </div>
    </div>

    <div class="nova-top-bar__center" aria-hidden="true" />

    <NovaTopBarTray />
  </header>
</template>

<style scoped lang="scss">
.nova-top-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: var(--owd-system-bar-height);
  padding: var(--owd-system-bar-padding) 10px;
  box-sizing: border-box;
  background: var(--nova-shell-bar-bg, rgba(6, 10, 16, 0.92));
  border-bottom: 1px solid var(--owd-surface-700);
  color: #f1f5f9;
  flex-shrink: 0;
  position: relative;
  z-index: 10050;
}

.nova-top-bar__start {
  flex: 0 0 auto;
  min-width: 0;
}

.nova-top-bar__start-anchor {
  position: relative;
  display: inline-block;
}

.nova-top-bar__center {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.nova-top-bar__tray) {
  margin-left: auto;
}
</style>
