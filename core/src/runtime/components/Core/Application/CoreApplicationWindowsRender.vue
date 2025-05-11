<script setup lang="ts">
defineProps<{
  workspaceFilter?: string
  windows: Map<string, IApplicationController['windows']>
}>()
</script>

<template>
  <template
      v-for="[windowId, window] in windows"
      :key="windowId"
  >
    <component
        v-if="!workspaceFilter || (workspaceFilter && window.state.workspace === workspaceFilter)"
        :window="window"
        :is="window.config.component"
    />
  </template>
</template>