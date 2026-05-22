<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const applicationManager = useApplicationManager()

function onMenuClick() {
  window.alert('not implemented yet')
}
</script>

<template>
  <div class="owd-dock-bar">
    <div class="owd-dock-bar__inner">
      <DockBarButtonApp
        v-for="application of applicationManager.appsRunning.value"
        :application="application"
      />
      <Divider
        v-if="applicationManager.appsRunning.value.length > 0"
        layout="vertical"
      />
      <DockBarButtonMenu @click="onMenuClick" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.owd-dock-bar {
  padding: var(--p-dock-bar-spacing);
  text-align: center;

  &__inner {
    display: inline-flex;
    flex-direction: row;
    gap: var(--p-dock-bar-spacing);
    margin: 0 auto;
    padding: var(--p-dock-bar-spacing);
    border-radius: 24px;
    background: rgba(var(--owd-hover-background-color));
  }

  .p-divider-vertical:before {
    color: transparent;
  }
}
</style>
