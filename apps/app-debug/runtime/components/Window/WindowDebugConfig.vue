<script setup lang="ts">
defineProps<{
  window: IWindowController
}>()
</script>

<template>
  <pre v-text="window.config" />
</template>
