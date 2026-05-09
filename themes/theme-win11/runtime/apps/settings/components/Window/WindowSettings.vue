<script setup lang="ts">
import Win11SettingsShell from '../settings/Win11SettingsShell.vue'

defineProps<{
  window: IWindowController
}>()
</script>

<template>
  <Win11SettingsShell v-bind="$props" />
</template>
