<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const applicationManager = useApplicationManager()
const appsRunning = applicationManager.appsRunning
</script>

<template>
  <div class="owd-dock-bar">
    <div class="owd-dock-bar__inner">
      <DockBarButtonMenu />
      <DockBarButtonApp
        v-for="application of appsRunning"
        :key="application.id"
        :application="application"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.owd-dock-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  &__inner {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .p-divider-vertical:before {
    color: transparent;
  }
}
</style>
