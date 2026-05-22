<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import ExplorerViewModeSwitch from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerViewModeSwitch.vue'

defineProps<{
  count: number
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()
</script>

<template>
  <footer class="gnome-explorer-status-bar" role="status">
    <span>{{ count }} {{ count === 1 ? 'item' : 'items' }}</span>
    <div class="gnome-explorer-status-bar__spacer" />
    <ExplorerViewModeSwitch
      class="gnome-explorer-status-bar__view"
      :model-value="fsExplorer.layout.value"
      aria-label="View mode"
      @select="fsExplorer.setLayout($event)"
    />
  </footer>
</template>

<style scoped lang="scss">
.gnome-explorer-status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  color: rgba(245, 245, 245, 0.76);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--gnome-explorer-header-bg, #383838);
}

.gnome-explorer-status-bar__spacer {
  flex: 1;
}

.gnome-explorer-status-bar__view {
  :deep([data-part='viewmode-root']) {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  :deep(.explorer-view-mode-switch__btn) {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &.is-active {
      background: rgba(80, 170, 255, 0.24);
      color: rgba(220, 242, 255, 0.98);
    }
  }
}
</style>
