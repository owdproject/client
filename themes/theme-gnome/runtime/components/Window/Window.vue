<script setup lang="ts">
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const props = defineProps<{
  window?: IWindowController
  content?: any
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

function onWorkspaceWindowDragStart(e) {
  e.dataTransfer.setData('text', props.window?.state.id)
}
</script>

<template>
  <CoreWindow
    v-bind="$props"
    v-show="window?.state?.active ?? true"
    :draggable="desktopWorkspaceStore.overview ? 'true' : 'false'"
    @dragstart="onWorkspaceWindowDragStart"
  >
    <Sheet border rounded>
      <WindowNav>
        <template v-slot:prepend>
          <slot name="nav-prepend" />
        </template>

        <template v-slot:append>
          <slot name="nav-append" />
        </template>
      </WindowNav>

      <WindowContent>
        <slot />
      </WindowContent>
    </Sheet>
  </CoreWindow>
</template>

<style scoped lang="scss">
.owd-window {
  border-width: 1px;
  border-style: solid;
  border-color: #0c0c0c;
  box-shadow: 0 0 10px 0 rgba(21, 21, 21, 0.5);
  border-radius: var(--p-window-border-radius);

  :deep(> .owd-sheet) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}
</style>
