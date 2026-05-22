<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import ExplorerViewModeSwitch from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerViewModeSwitch.vue'

defineProps<{
  count: number
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()
</script>

<template>
  <footer class="nova-explorer-status-bar" role="status">
    <span>{{ count }} {{ count === 1 ? 'item' : 'items' }}</span>
    <div class="nova-explorer-status-bar__spacer" />
    <ExplorerViewModeSwitch
      class="nova-explorer-status-bar__view"
      :model-value="fsExplorer.layout.value"
      aria-label="View mode"
      @select="fsExplorer.setLayout($event)"
    />
  </footer>
</template>

<style scoped lang="scss">
.nova-explorer-status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--nova-explorer-text-muted);
  border-top: 1px solid var(--nova-explorer-border-subtle);
  background: var(--nova-explorer-surface-elevated);
}

.nova-explorer-status-bar__spacer {
  flex: 1;
}

.nova-explorer-status-bar__view {
  :deep([data-part='viewmode-root']) {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  :deep(.explorer-view-mode-switch__btn) {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: var(--nova-window-control-radius, 8px);
    background: transparent;
    color: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--nova-window-control-hover);
      color: var(--nova-explorer-text);
    }

    &.is-active {
      background: var(--nova-accent-muted);
      color: var(--nova-explorer-accent);
    }
  }
}
</style>
