<script setup lang="ts">
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'

const props = defineProps<{
  window?: IWindowController
  content?: unknown
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

function onWorkspaceWindowDragStart(e: DragEvent) {
  if (!props.window?.state?.id) return
  e.dataTransfer?.setData('text', props.window.state.id)
}
</script>

<template>
  <Frame
    v-bind="$props"
    :draggable="desktopWorkspaceStore.overview ? 'true' : 'false'"
    @dragstart="onWorkspaceWindowDragStart"
  >
    <template #nav-prepend>
      <slot name="nav-prepend" />
    </template>
    <template #nav-append>
      <slot name="nav-append" />
    </template>
    <slot />
  </Frame>
</template>
