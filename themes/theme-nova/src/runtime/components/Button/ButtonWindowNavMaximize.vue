<script setup lang="ts">
import { computed, inject } from 'vue'
import type { IWindowController } from '@owdproject/core'

const windowController = inject<IWindowController>('windowController')

const icon = computed(() =>
  windowController?.isMaximized ? 'mdi:window-restore' : 'mdi:window-maximize',
)
</script>

<template>
  <ButtonWindowNav title="Maximize" class="owd-window-nav__button--maximize">
    <Icon :name="icon" :size="14" />
  </ButtonWindowNav>
</template>
