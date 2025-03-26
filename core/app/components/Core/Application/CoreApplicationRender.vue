<script setup lang="ts">
const applicationManager = useApplicationManager()
</script>

<template>
  <CoreApplicationWindowsRender
      v-for="[appId, app] of applicationManager.appsRunning"
      :windows="app.windowsOpened"
      :key="appId"
  />
</template>