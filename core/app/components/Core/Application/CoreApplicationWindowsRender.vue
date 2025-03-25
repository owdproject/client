<script setup lang="ts">
defineProps<{
  windows: IApplicationController['windows']
}>()
</script>

<template>
  <component
      v-for="[windowId, window] in windows"
      :key="windowId"
      :window="window"
      :is="window.config.component"
  />
</template>