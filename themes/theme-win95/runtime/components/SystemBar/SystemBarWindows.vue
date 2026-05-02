<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const applicationManager = useApplicationManager()
</script>

<template>
  <div
    v-if="applicationManager.windowsOpened.value.length > 0"
    class="owd-system-bar__windows"
  >
    <Button
      v-for="[windowId, window] of applicationManager.windowsOpened.value"
      :key="window.state.id"
      :class="[
        'p-button--system-bar truncate',
        { 'p-button--active': window.state.active },
      ]"
      @pointerdown.self="window.actions.toggleMinimize"
    >
      <span v-text="window.title" />
    </Button>
  </div>
</template>

<style scoped lang="scss">
.owd-system-bar__windows {
  display: inline-flex;
  height: 100%;

  :deep(> .p-button) {
    max-width: 240px;
    margin-right: var(--owd-gap);
  }
}
</style>
