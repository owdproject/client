<script setup lang="ts">
defineProps<{
  workspaceFilter: string
}>()

const applicationManager = useApplicationManager()
</script>

<template>
  <CoreApplicationWindowsRender
      v-for="[appId, app] of applicationManager.appsRunning"
      :workspace-filter="workspaceFilter"
      :windows="app.windowsOpened"
      :key="appId"
  />
</template>