<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const applicationManager = useApplicationManager()
</script>

<template>
  <div class="owd-dock-bar">
    <div class="owd-dock-bar__inner">
      <DockBarButtonApp
        v-for="application of applicationManager.appsRunning.value"
        :key="application.id"
        :application="application"
      />
      <Divider
        v-if="applicationManager.appsRunning.value.length > 0"
        layout="vertical"
      />
      <DockBarButtonMenu />
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
