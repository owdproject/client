<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import type { MenuItem } from 'primevue/menuitem'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GnomeExplorerOverflowMenu from './GnomeExplorerOverflowMenu.vue'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
  overflowMenu: MenuItem[]
}>()

const { t } = useI18n()

const viewMenu = ref<InstanceType<typeof Menu> | null>(null)
const sortMenu = ref<InstanceType<typeof Menu> | null>(null)

function toggleView(e: Event) {
  viewMenu.value?.toggle(e)
}

function toggleSort(e: Event) {
  sortMenu.value?.toggle(e)
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

/** Fluent popup panels (PrimeVue portals to body; styled in explorer-prime-overlays.scss) */
const explorerOverlayPt = {
  root: { class: 'gnome-explorer-popup-menu' },
}

const sortItems = computed<MenuItem[]>(() => [
  {
    label: 'Sort by name',
    command: () => {
      void props.fsExplorer.refreshDirectory()
    },
  },
  {
    label: 'Sort by date modified',
    command: () => {
      void props.fsExplorer.refreshDirectory()
    },
  },
])
</script>

<template>
  <div class="gnome-explorer-command-bar">
    <div class="gnome-explorer-command-bar__group">
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.newFolder')"
        @click="fsExplorer.createNewDirectory()"
      >
        <Icon name="mdi:folder-plus-outline" size="18" />
      </Button>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.cut')"
        @click="fsExplorer.cutSelectedFiles()"
      >
        <Icon name="mdi:content-cut" size="18" />
      </Button>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.copy')"
        @click="fsExplorer.copySelectedFiles()"
      >
        <Icon name="mdi:content-copy" size="16" />
      </Button>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.paste')"
        @click="fsExplorer.fsController?.pasteClipboardFiles()"
      >
        <Icon name="mdi:content-paste" size="17" />
      </Button>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.rename')"
        @click="() => {}"
      >
        <Icon name="mdi:pencil-outline" size="20" />
      </Button>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        :aria-label="t('apps.explorer.action.delete')"
        @click="fsExplorer.fsController?.deleteSelectedFiles()"
      >
        <Icon name="mdi:delete-outline" size="20" />
      </Button>
    </div>

    <span class="gnome-explorer-command-bar__sep" aria-hidden="true" />

    <div class="gnome-explorer-command-bar__group">
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        aria-haspopup="true"
        aria-label="Sort"
        @click="toggleSort"
      >
        <Icon name="mdi:sort-variant" size="20" />
      </Button>
      <Menu ref="sortMenu" :model="sortItems" popup :pt="explorerOverlayPt" />

      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        aria-haspopup="true"
        :aria-label="t('apps.explorer.menu.view')"
        @click="toggleView"
      >
        <Icon name="mdi:view-grid-outline" size="18" />
      </Button>
      <Menu ref="viewMenu" :model="viewItems" popup :pt="explorerOverlayPt" />
    </div>

    <span class="gnome-explorer-command-bar__grow" />

    <GnomeExplorerOverflowMenu :model="overflowMenu" />
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-command-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  min-height: 34px;
  padding: 2px 4px;
  color: rgba(245, 245, 245, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
}

.gnome-explorer-command-bar__group {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.gnome-explorer-command-bar__sep {
  width: 1px;
  align-self: stretch;
  margin: 4px 6px;
  background: rgba(0, 0, 0, 0.1);
}

.gnome-explorer-command-bar__grow {
  flex: 1;
  min-width: 8px;
}

.gnome-explorer-command-bar :deep(.p-button) {
  color: rgba(245, 245, 245, 0.96);
  width: 28px;
  height: 28px;
}

.gnome-explorer-command-bar :deep(.p-button > .iconify) {
  display: inline-block;
  width: 1em;
  height: 1em;
  color: rgba(245, 245, 245, 0.96) !important;
  opacity: 1;
}
</style>
