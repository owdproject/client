<script setup lang="ts">
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import NovaStartButton from './NovaStartButton.vue'
import NovaTopBarTray from './NovaTopBarTray.vue'

const { systemBarEnabled, startButtonEnabled } = useDesktopShellOptions()
</script>

<template>
  <header
    v-if="systemBarEnabled"
    class="nova-top-bar owd-desktop__system-bar"
  >
    <div class="nova-top-bar__start">
      <div
        v-if="startButtonEnabled"
        class="nova-top-bar__start-anchor"
      >
        <NovaStartButton />
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
  min-width: 0;
  height: var(--owd-system-bar-height);
  padding: var(--owd-system-bar-padding) 10px;
  box-sizing: border-box;
  background: var(--nova-shell-bar-bg, rgba(6, 10, 16, 0.92));
  border-bottom: 1px solid var(--owd-surface-700);
  color: #f1f5f9;
  flex-shrink: 0;
  position: relative;
  z-index: 10061;
  overflow: visible;
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

</style>
