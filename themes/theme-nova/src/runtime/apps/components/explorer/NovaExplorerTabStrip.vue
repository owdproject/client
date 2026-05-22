<script setup lang="ts">
import ExplorerTabStripBase from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerTabStripBase.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  tabs: { id: string; label: string }[]
  activeTabId: string
}>()

const emit = defineEmits<{
  select: [id: string]
  add: []
  close: [id: string]
}>()

const { t } = useI18n()
</script>

<template>
  <ExplorerTabStripBase
    class="nova-explorer-tab-strip"
    :tabs="tabs"
    :active-tab-id="activeTabId"
    :aria-label="t('apps.explorer.tabs.ariaLabel')"
    :new-tab-aria-label="t('apps.explorer.tabs.newTab')"
    :close-tab-aria-label="t('apps.explorer.tabs.closeTab')"
    @select="emit('select', $event)"
    @add="emit('add')"
    @close="emit('close', $event)"
  />
</template>

<style scoped lang="scss">
/* Tab row below caption (GNOME Files–style), not in the window control strip. */
.nova-explorer-tab-strip {
  border-bottom: 1px solid var(--nova-explorer-border-subtle);

  :deep([data-part='tabstrip-root']) {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    gap: 2px;
    padding: 4px 8px 0;
    overflow-x: auto;
    scrollbar-width: none;
    background: transparent;
  }

  :deep([data-part='tab']) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 200px;
    min-height: 30px;
    padding: 0 12px;
    margin: 0;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    background: color-mix(in srgb, var(--nova-explorer-text) 4%, transparent);
    color: var(--nova-explorer-text-muted);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: default;
    transition:
      background 0.12s ease,
      color 0.12s ease;

    &[aria-selected='true'] {
      border-color: var(--nova-explorer-border-subtle);
      border-bottom-color: transparent;
      background: var(--nova-explorer-surface);
      color: var(--nova-explorer-text);
      box-shadow: inset 0 2px 0 var(--nova-explorer-accent-line);
    }

    &:hover {
      background: color-mix(in srgb, var(--nova-explorer-text) 8%, transparent);
      color: var(--nova-explorer-text);
    }

    &[aria-selected='true']:hover {
      background: var(--nova-explorer-surface);
    }
  }

  :deep(.explorer-tab-strip-base__tab-label) {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  :deep([data-part='tab-close']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: var(--nova-window-control-radius, 8px);
    background: transparent;
    color: inherit;
    font-size: 16px;
    line-height: 1;
    opacity: 0.65;

    &:hover {
      opacity: 1;
      background: var(--nova-window-control-hover);
    }
  }

  :deep([data-part='tab-new']) {
    position: sticky;
    right: 2px;
    z-index: 2;
    margin-left: auto;
    flex-shrink: 0;
    width: 30px;
    margin-bottom: 2px;
    padding: 0;
    border: 1px solid var(--nova-explorer-border-subtle);
    border-radius: var(--nova-window-control-radius, 8px);
    background: color-mix(in srgb, var(--nova-explorer-surface) 80%, transparent);
    color: var(--nova-explorer-text-muted);
    font-size: 18px;
    line-height: 1;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;

    &:hover {
      background: var(--nova-window-control-hover);
      color: var(--nova-explorer-text);
      border-color: var(--nova-explorer-border);
    }
  }
}
</style>
