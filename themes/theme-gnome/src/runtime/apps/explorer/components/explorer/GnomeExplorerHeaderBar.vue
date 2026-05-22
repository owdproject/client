<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import type { MenuItem } from 'primevue/menuitem'
import GnomeExplorerChromeBand from './GnomeExplorerChromeBand.vue'
import GnomeExplorerHeaderActions from './GnomeExplorerHeaderActions.vue'

defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
  overflowMenu: MenuItem[]
  arrowsDisabled: boolean
  path: string
}>()

const emit = defineEmits<{
  back: []
  forward: []
  up: []
  refresh: []
  navigate: [path: string]
  commit: [path: string]
}>()
</script>

<template>
  <div class="gnome-explorer-header-bar">
    <GnomeExplorerChromeBand
      class="gnome-explorer-header-bar__chrome"
      :arrows-disabled="arrowsDisabled"
      :path="path"
      @back="emit('back')"
      @forward="emit('forward')"
      @up="emit('up')"
      @refresh="emit('refresh')"
      @navigate="emit('navigate', $event)"
      @commit="emit('commit', $event)"
    />
    <GnomeExplorerHeaderActions
      :fs-explorer="fsExplorer"
      :overflow-menu="overflowMenu"
    />
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-header-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px 6px 6px;
  background: var(--gnome-explorer-header-bg, #383838);
  border-bottom: 1px solid var(--gnome-explorer-border, rgba(255, 255, 255, 0.08));
}

.gnome-explorer-header-bar__chrome {
  flex: 1;
  min-width: 0;
}
</style>
