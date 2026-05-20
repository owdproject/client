<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import type { MenuItem } from 'primevue/menuitem'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GnomeExplorerOverflowMenu from './GnomeExplorerOverflowMenu.vue'

const props = defineProps<{
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
  overflowMenu: MenuItem[]
}>()

const { t } = useI18n()
const viewMenu = ref<InstanceType<typeof Menu> | null>(null)

const explorerOverlayPt = {
  root: { class: 'gnome-explorer-popup-menu' },
}

const viewItems = computed<MenuItem[]>(() => [
  {
    label: t('apps.explorer.layout.largeIcons'),
    command: () => props.fsExplorer.setLayout('largeIcons'),
  },
  {
    label: t('apps.explorer.layout.smallIcons'),
    command: () => props.fsExplorer.setLayout('smallIcons'),
  },
  {
    label: t('apps.explorer.layout.list'),
    command: () => props.fsExplorer.setLayout('list'),
  },
  {
    label: t('apps.explorer.layout.details'),
    command: () => props.fsExplorer.setLayout('details'),
  },
])

function toggleView(e: Event) {
  viewMenu.value?.toggle(e)
}
</script>

<template>
  <div class="gnome-explorer-header-actions">
    <GnomeExplorerOverflowMenu :model="overflowMenu" />
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      :aria-label="t('apps.explorer.action.newFolder')"
      @click="fsExplorer.createNewDirectory()"
    >
      <Icon name="mdi:folder-plus-outline" size="20" />
    </Button>
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      aria-haspopup="true"
      :aria-label="t('apps.explorer.menu.view')"
      @click="toggleView"
    >
      <Icon name="mdi:view-grid-outline" size="20" />
    </Button>
    <Menu ref="viewMenu" :model="viewItems" popup :pt="explorerOverlayPt" />
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding-right: 4px;
}

.gnome-explorer-header-actions :deep(.p-button) {
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
  width: 32px;
  height: 32px;
}
</style>
