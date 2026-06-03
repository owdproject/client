<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceEdgeDrop } from '../composables/useWorkspaceEdgeDrop'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const props = defineProps<{
  enabled?: boolean
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { edgeHint, edgeTargetDesktopIndex } = useWorkspaceEdgeDrop()

const visible = computed(
  () =>
    props.enabled !== false &&
    !desktopWorkspaceStore.overview &&
    desktopWorkspaceStore.list.length > 1 &&
    edgeHint.value !== null &&
    edgeTargetDesktopIndex.value !== null,
)
</script>

<template>
  <div
    v-if="visible"
    class="owd-workspace-edge-hints"
    aria-hidden="true"
  >
    <div
      class="owd-workspace-edge-hints__zone owd-workspace-edge-hints__zone--left"
      :class="{
        'owd-workspace-edge-hints__zone--active': edgeHint === 'left',
      }"
    >
      <slot
        name="left"
        :desktop-index="edgeTargetDesktopIndex"
        :side="'left' as const"
      />
    </div>
    <div
      class="owd-workspace-edge-hints__zone owd-workspace-edge-hints__zone--right"
      :class="{
        'owd-workspace-edge-hints__zone--active': edgeHint === 'right',
      }"
    >
      <slot
        name="right"
        :desktop-index="edgeTargetDesktopIndex"
        :side="'right' as const"
      />
    </div>
  </div>
</template>

<style scoped>
.owd-workspace-edge-hints {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999998;
}

.owd-workspace-edge-hints__zone {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 72px;
  opacity: 0;
  transition: opacity 120ms ease;
}

.owd-workspace-edge-hints__zone--left {
  left: 0;
}

.owd-workspace-edge-hints__zone--right {
  right: 0;
}

.owd-workspace-edge-hints__zone--active {
  opacity: 1;
}
</style>
