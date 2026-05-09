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
    class="owd-window-nav__interactive win11-explorer-tab-strip"
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
.win11-explorer-tab-strip {
  :deep([data-part='tabstrip-root']) {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    gap: 1px;
    padding: 0 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  :deep([data-part='tab']) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 200px;
    min-height: 28px;
    padding: 0 11px;
    margin: 5px 0 0;
    border: none;
    border-radius: 5px 5px 0 0;
    background: color-mix(in srgb, var(--win11-shell-text, #fff) 6%, transparent);
    color: color-mix(in srgb, var(--win11-shell-text, #fff) 82%, transparent);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: default;
    transition:
      background 0.12s ease,
      color 0.12s ease;

    &[aria-selected='true'] {
      margin-bottom: 0;
      padding-bottom: 4px;
      border-radius: 6px 6px 0 0;
      background: var(--win11-explorer-chrome-light, rgba(58, 58, 62, 0.94));
      color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
      box-shadow: none;
    }

    &:hover {
      background: color-mix(in srgb, var(--win11-shell-text, #fff) 11%, transparent);
    }

    &[aria-selected='true']:hover {
      background: var(--win11-explorer-chrome-light, rgba(58, 58, 62, 0.94));
      filter: brightness(1.06);
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
    border-radius: 3px;
    background: transparent;
    color: inherit;
    font-size: 16px;
    line-height: 1;
    opacity: 0.65;

    &:hover {
      opacity: 1;
      background: color-mix(in srgb, var(--win11-shell-text, #fff) 14%, transparent);
    }
  }

  :deep([data-part='tab-new']) {
    position: sticky;
    right: 2px;
    z-index: 2;
    margin-left: auto;
    flex-shrink: 0;
    width: 30px;
    margin: 5px 2px 0;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: color-mix(
      in srgb,
      var(--win11-explorer-chrome-light, rgba(58, 58, 62, 0.94)) 86%,
      transparent
    );
    color: color-mix(in srgb, var(--win11-shell-text, #fff) 86%, transparent);
    font-size: 18px;
    line-height: 1;
    transition: background 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--win11-shell-text, #fff) 10%, transparent);
    }
  }
}
</style>
