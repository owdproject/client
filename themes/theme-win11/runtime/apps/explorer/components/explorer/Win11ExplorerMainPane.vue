<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import Win11ExplorerNavPane from './Win11ExplorerNavPane.vue'
import Win11ExplorerContentPane from './Win11ExplorerContentPane.vue'

defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()
</script>

<template>
  <div class="win11-explorer-main-pane">
    <Win11ExplorerNavPane :window="window" :fs-explorer="fsExplorer" />
    <Win11ExplorerContentPane :window="window" :fs-explorer="fsExplorer" />
  </div>
</template>

<style scoped lang="scss">
.win11-explorer-main-pane {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
</style>
