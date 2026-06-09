<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useWindowSnapDrop } from '@owdproject/core/runtime/composables/useWindowSnapDrop'

const props = defineProps<{
  enabled?: boolean
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { snapHint, snapHintRect, isSnapDragActive } = useWindowSnapDrop()

const visible = computed(
  () =>
    props.enabled !== false &&
    !desktopWorkspaceStore.overview &&
    isSnapDragActive.value &&
    snapHint.value !== null &&
    snapHintRect.value !== null,
)

const hintStyle = computed(() => {
  const rect = snapHintRect.value
  if (!rect) return undefined

  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
})
</script>

<template>
  <div
    v-if="visible"
    class="owd-window-snap-hints"
    aria-hidden="true"
  >
    <div
      class="owd-window-snap-hints__zone"
      :class="`owd-window-snap-hints__zone--${snapHint}`"
      :style="hintStyle"
    >
      <slot
        :zone="snapHint"
        :rect="snapHintRect"
      />
    </div>
  </div>
</template>

<style scoped>
.owd-window-snap-hints {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999998;
}

.owd-window-snap-hints__zone {
  position: fixed;
  box-sizing: border-box;
  border: 2px solid rgba(96, 165, 250, 0.85);
  background: rgba(96, 165, 250, 0.18);
  border-radius: 4px;
  transition:
    left 80ms ease,
    top 80ms ease,
    width 80ms ease,
    height 80ms ease;
}
</style>
