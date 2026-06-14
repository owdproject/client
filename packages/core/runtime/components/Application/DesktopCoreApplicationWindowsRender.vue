<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'

const props = defineProps<{
  workspaceFilter?: string
  windows: Map<string, IWindowController>
  /** Tracks ApplicationController.openWindowCount so Vue re-renders when the map is replaced. */
  windowRevision?: number
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

const windowEntries = computed(() => {
  void props.windowRevision
  return Array.from(props.windows.entries())
})

function matchesWorkspace(window: IWindowController): boolean {
  const filter = props.workspaceFilter
  if (!filter) return true

  const ws = window.state.workspace
  if (!ws) {
    return filter === desktopWorkspaceStore.active
  }

  return ws === filter
}
</script>

<template>
  <template v-for="[windowId, window] in windowEntries" :key="windowId">
    <Suspense v-if="matchesWorkspace(window)">
      <component :window="window" :is="window.config.component" />
    </Suspense>
  </template>
</template>
