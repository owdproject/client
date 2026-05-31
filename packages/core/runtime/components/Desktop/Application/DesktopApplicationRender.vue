<script setup lang="ts">
import { useApplicationManager } from '../../../composables/useApplicationManager'

defineProps<{
  workspaceFilter?: string
}>()

const applicationManager = useApplicationManager()
const runningApps = applicationManager.appsRunning
</script>

<template>
  <DesktopApplicationWindowsRender
    v-for="app of runningApps"
    :key="app.id"
    :workspace-filter="workspaceFilter"
    :windows="app.windowsOpened"
    :window-revision="app.openWindowCount.value"
  />
</template>
