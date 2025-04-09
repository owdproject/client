<script setup lang="ts">
defineProps<{
  workspaceFilter?: string
}>()

const applicationManager = useApplicationManager()
</script>

<template>
  <CoreApplicationWindowsRender
      v-for="app of applicationManager.appsRunning"
      :workspace-filter="workspaceFilter"
      :windows="app.windowsOpened"
  />
</template>