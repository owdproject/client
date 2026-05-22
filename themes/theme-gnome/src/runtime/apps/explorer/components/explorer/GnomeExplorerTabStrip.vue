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
    class="owd-window-nav__interactive gnome-explorer-tab-strip"
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
.gnome-explorer-tab-strip {
  :deep([data-part='tabstrip-root']) {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    gap: 2px;
    padding: 0 8px 4px;
    overflow-x: auto;
    scrollbar-width: none;
    background: var(--gnome-explorer-header-bg, #383838);
  }

  :deep([data-part='tab']) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 200px;
    min-height: 32px;
    padding: 0 12px;
    margin: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 70%, transparent);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: default;
    transition: background 0.12s ease;

    &[aria-selected='true'] {
      background: var(--gnome-explorer-tab-active-bg, #4a4a4a);
      color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.96));
    }

    &:hover:not([aria-selected='true']) {
      background: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 8%, transparent);
    }
  }

  :deep([data-part='tab-close']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font-size: 14px;
    line-height: 1;
    opacity: 0.7;

    &:hover {
      opacity: 1;
      background: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 12%, transparent);
    }
  }

  :deep([data-part='tab-new']) {
    flex-shrink: 0;
    width: 28px;
    min-height: 28px;
    margin: 2px 0 0 4px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 75%, transparent);
    font-size: 18px;
    line-height: 1;

    &:hover {
      background: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 10%, transparent);
    }
  }
}
</style>
