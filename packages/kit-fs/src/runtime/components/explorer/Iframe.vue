<script setup>
import Frame from "./Frame.vue";
defineProps({
  config: { type: Object, required: false },
  window: { type: Object, required: false },
  src: { type: String, required: true },
  width: { type: String, required: true },
  height: { type: String, required: true },
  allow: { type: String, required: true }
});
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

<style scoped>
:deep(.owd-window__content) {
  height: 100%;
}

iframe {
  border: 0;
}
</style>
