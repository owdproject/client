<script setup lang="ts">
import { computed, inject } from 'vue'

const windowController = inject<IWindowController>('windowController')

const icon = computed(() =>
  windowController?.isMaximized ? 'mdi:window-restore' : 'mdi:window-maximize',
)
</script>

<template>
  <ButtonWindowNav>
    <Icon :name="icon" :size="14" />
  </ButtonWindowNav>
</template>
