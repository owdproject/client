<script setup lang="ts">
import { useWorkspaceEdgeDropWindowHandlers } from '@owdproject/kit-theme/runtime/composables/useWorkspaceEdgeDrop'

const props = defineProps<{
  config?: WindowConfig
  window?: IWindowController
  content?: any
}>()

const { onDragStart, onDragEnd } = useWorkspaceEdgeDropWindowHandlers(
  () => props.window,
)
</script>

<template>
  <CoreWindow
    v-bind="$props"
    v-show="window?.state?.active !== false"
    @drag:start="onDragStart"
    @drag:end="onDragEnd"
  >
    <Card border rounded :pt:body="{ class: 'p-0' }">
      <template #header>
        <WindowNav>
          <template #prepend>
            <slot name="nav-prepend" />
          </template>

          <template #append>
            <slot name="nav-append" />
          </template>
        </WindowNav>
      </template>
      <template #content>
        <WindowContent>
          <slot />
        </WindowContent>
      </template>
    </Card>
  </CoreWindow>
</template>

<style scoped lang="scss">
/* Chrome colors live in assets/styles/partials/window-chrome.scss */
.owd-window {
  box-sizing: border-box;
  min-width: 160px;
  min-height: 160px;
}
</style>
