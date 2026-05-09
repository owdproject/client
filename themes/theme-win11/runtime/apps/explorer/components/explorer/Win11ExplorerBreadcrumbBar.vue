<script setup lang="ts">
import ExplorerBreadcrumbBase from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerBreadcrumbBase.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  path: string
}>()

const emit = defineEmits<{
  navigate: [path: string]
  commit: [path: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="win11-explorer-breadcrumb-row">
    <ExplorerBreadcrumbBase
      class="win11-explorer-breadcrumb-row__base"
      :path="props.path"
      :root-label="t('apps.explorer.tabs.thisPc')"
      :aria-label="t('apps.explorer.breadcrumb.ariaLabel')"
      :show-address="false"
      :search-placeholder="t('apps.explorer.search.placeholder')"
      @navigate="emit('navigate', $event)"
      @commit="emit('commit', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
.win11-explorer-breadcrumb-row {
  display: flex;
  min-width: 0;
}

.win11-explorer-breadcrumb-row__base {
  width: 100%;

  :deep([data-part='breadcrumb-root']) {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 1;
    min-width: 0;
    padding: 1px 6px 1px 0;
    color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
    background: transparent;
    flex-wrap: nowrap;
  }

  :deep([data-part='breadcrumb-crumbs']) {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--win11-window-border, rgba(255, 255, 255, 0.1)) 65%, transparent);
    background: color-mix(in srgb, var(--win11-explorer-chrome-light, rgba(58, 58, 62, 0.94)) 88%, transparent);
  }

  :deep([data-part='breadcrumb-chevron']) {
    flex-shrink: 0;
    margin: 0 2px;
    color: color-mix(in srgb, var(--win11-shell-text, #fff) 46%, transparent);
  }

  :deep([data-part='breadcrumb-segment']) {
    max-width: 160px;
    padding: 2px 4px;
    margin: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: color-mix(in srgb, var(--win11-shell-text, #fff) 8%, transparent);
    }

    &[aria-current='page'] {
      color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
    }
  }

  :deep([data-part='breadcrumb-search']) {
    width: 170px;
    flex: 0 1 170px;
    border-radius: 4px;
    opacity: 0.85;
    font-size: 12px;
    color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
    background: color-mix(in srgb, var(--win11-explorer-chrome-light, rgba(58, 58, 62, 0.94)) 88%, transparent);
    border-color: color-mix(in srgb, var(--win11-window-border, rgba(255, 255, 255, 0.1)) 65%, transparent);
    border-width: 1px;
    border-style: solid;
    padding: 5px 8px;
  }
}
</style>
