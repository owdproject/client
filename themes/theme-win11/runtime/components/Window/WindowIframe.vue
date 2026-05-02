<script setup lang="ts">
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
  <Window :config="config" :window="window">
    <template #nav-prepend>
      <slot name="nav-prepend" />
    </template>
    <template #nav-append>
      <slot name="nav-append" />
    </template>
    <iframe
      :class="{ 'pointer-events-none': !window.state.focused }"
      :src="src"
      :width="width"
      :height="height"
      :allow="allow"
    />
  </Window>
</template>

<style scoped lang="scss">
:deep(.owd-window__content) {
  height: 100%;
}

iframe {
  border: 0;
}
</style>
