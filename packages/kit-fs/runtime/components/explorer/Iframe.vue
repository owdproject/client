<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import Frame from './Frame.vue'

defineProps<{
  config?: WindowConfig
  window?: IWindowController
  src: string
  width: string
  height: string
  allow: string
}>()
</script>

<template>
  <Frame :config="config" :window="window">
    <template #nav-prepend>
      <slot name="nav-prepend" />
    </template>
    <template #nav-append>
      <slot name="nav-append" />
    </template>
    <iframe
      :class="{ 'pointer-events-none': !window?.state.focused }"
      :src="src"
      :width="width"
      :height="height"
      :allow="allow"
    />
  </Frame>
</template>

<style scoped lang="scss">
:deep(.owd-window__content) {
  height: 100%;
}

iframe {
  border: 0;
}
</style>
