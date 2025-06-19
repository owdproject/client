<script setup lang="ts">
import { useApplicationManager } from '../../../composables/useApplicationManager'

defineProps<{
  workspaceFilter?: string
}>()

const applicationManager = useApplicationManager()
</script>

<template>
  <CoreApplicationWindowsRender
    v-for="app of applicationManager.appsRunning.value"
    :key="app.id"
    :workspace-filter="workspaceFilter"
    :windows="app.windowsOpened"
  />
</template>
