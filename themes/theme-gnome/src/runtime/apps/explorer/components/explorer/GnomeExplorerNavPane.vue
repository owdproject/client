<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { openVfsFile } from '@owdproject/module-fs/runtime/utils/utilFsOpenFile'
import { GNOME_TRASH_PATH } from '../../composables/useGnomeExplorerPlaces'
import type { useGnomeExplorerPlaces } from '../../composables/useGnomeExplorerPlaces'
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
  widthPx?: number
}>()

const { t } = useI18n()
const places = inject<ReturnType<typeof useGnomeExplorerPlaces>>('gnomeExplorerPlaces')
if (!places) throw new Error('gnomeExplorerPlaces not provided')

const sidebarSearch = ref('')

const placeRows = computed(() => [
  { id: 'home' as const, label: t('apps.explorer.places.home'), icon: 'mdi:home' },
  { id: 'recent' as const, label: t('apps.explorer.places.recent'), icon: 'mdi:history' },
  { id: 'starred' as const, label: t('apps.explorer.places.starred'), icon: 'mdi:star' },
  { id: 'network' as const, label: t('apps.explorer.places.network'), icon: 'mdi:lan-connect' },
  { id: 'trash' as const, label: t('apps.explorer.places.trash'), icon: 'mdi:delete-outline' },
])

async function goPath(path: string) {
  const target = path.startsWith('/') ? path : `/${path}`
  places.selectPlace('folder', target)
  props.fsExplorer.basePath.value = target
  props.fsExplorer.fsDirectoryNavigation.push(target)
  await props.fsExplorer.navigateToDirectory(target)
}

async function onPlaceClick(id: (typeof placeRows.value)[number]['id']) {
  places.selectPlace(id)
  if (id === 'home') await goPath('/')
  else if (id === 'trash') await goPath(GNOME_TRASH_PATH)
  else if (id === 'recent' || id === 'starred' || id === 'network') {
    props.window.meta = { ...props.window.meta, gnomePlaceView: id }
  }
}

async function onFolderClick(path: string) {
  props.window.meta = { ...props.window.meta, gnomePlaceView: null }
  await goPath(path)
}

async function onRecentFile(path: string) {
  const opened = await openVfsFile(path)
  if (!opened) {
    const parent = path.replace(/\/[^/]+$/, '') || '/'
    await goPath(parent)
  }
}

function isActivePlace(id: string) {
  return places.activePlaceId.value === id
}

function isActiveFolder(path: string) {
  return (
    places.activePlaceId.value === 'folder' &&
    places.activeFolderPath.value === path
  )
}
</script>

<template>
  <aside
    class="gnome-explorer-nav-pane"
    aria-label="Places"
    :style="{
      width: `${props.widthPx ?? 248}px`,
      flex: `0 0 ${props.widthPx ?? 248}px`,
    }"
  >
    <div class="gnome-explorer-nav-pane__header">
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        class="gnome-explorer-nav-pane__header-btn"
        :aria-label="t('apps.explorer.search.placeholder')"
      >
        <Icon name="mdi:magnify" size="18" />
      </Button>
      <span class="gnome-explorer-nav-pane__header-title">
        {{ t('apps.explorer.windowTitle') }}
      </span>
      <Button
        type="button"
        rounded
        variant="text"
        severity="secondary"
        class="gnome-explorer-nav-pane__header-btn"
        aria-label="Menu"
      >
        <Icon name="mdi:menu" size="18" />
      </Button>
    </div>

    <div class="gnome-explorer-nav-pane__search">
      <input
        v-model="sidebarSearch"
        type="search"
        class="gnome-explorer-nav-pane__search-input"
        :placeholder="t('apps.explorer.search.placeholder')"
      />
    </div>

    <div class="gnome-explorer-nav-pane__scroll">
      <button
        v-for="row in placeRows"
        :key="row.id"
        type="button"
        class="gnome-explorer-nav-pane__row"
        :class="{ 'gnome-explorer-nav-pane__row--active': isActivePlace(row.id) }"
        @click="onPlaceClick(row.id)"
      >
        <Icon :name="row.icon" size="16" />
        <span class="gnome-explorer-nav-pane__label">{{ row.label }}</span>
      </button>

      <div
        v-if="places.activePlaceId === 'recent' && places.recentFiles.value.length"
        class="gnome-explorer-nav-pane__subsection"
      >
        <button
          v-for="entry in places.recentFiles.value.slice(0, 12)"
          :key="entry.path"
          type="button"
          class="gnome-explorer-nav-pane__row gnome-explorer-nav-pane__row--nested"
          @click="onRecentFile(entry.path)"
        >
          <Icon name="mdi:file-outline" size="14" />
          <span class="gnome-explorer-nav-pane__label">{{ entry.name }}</span>
        </button>
      </div>

      <div class="gnome-explorer-nav-pane__separator" />

      <button
        v-for="folder in places.userFolders.value"
        :key="folder.id"
        type="button"
        class="gnome-explorer-nav-pane__row"
        :class="{ 'gnome-explorer-nav-pane__row--active': isActiveFolder(folder.path) }"
        @click="onFolderClick(folder.path)"
      >
        <Icon :name="folder.icon" size="16" />
        <span class="gnome-explorer-nav-pane__label">{{ folder.label }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.gnome-explorer-nav-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--gnome-explorer-sidebar-bg, #303030);
  border-right: 1px solid var(--gnome-explorer-border, rgba(255, 255, 255, 0.08));
}

.gnome-explorer-nav-pane__header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 10px 4px;
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
}

.gnome-explorer-nav-pane__header-title {
  flex: 1;
  font-weight: 700;
  font-size: 13px;
  text-align: center;
}

.gnome-explorer-nav-pane__header-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
}

.gnome-explorer-nav-pane__search {
  padding: 0 10px 8px;
  flex-shrink: 0;
}

.gnome-explorer-nav-pane__search-input {
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 8%, transparent);
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
  font: inherit;
  font-size: 12px;

  &::placeholder {
    color: color-mix(in srgb, var(--gnome-explorer-fg, #fff) 45%, transparent);
  }

  &:focus {
    outline: 2px solid var(--gnome-explorer-accent, #3584e4);
    outline-offset: 0;
  }
}

.gnome-explorer-nav-pane__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 12px;
}

.gnome-explorer-nav-pane__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: default;

  &:hover {
    background: var(--gnome-explorer-selection-bg, rgba(255, 255, 255, 0.08));
  }

  &--active {
    background: var(--gnome-explorer-selection-bg, rgba(255, 255, 255, 0.12));
    font-weight: 600;
  }

  &--nested {
    padding-left: 28px;
    font-size: 12px;
    opacity: 0.92;
  }
}

.gnome-explorer-nav-pane__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gnome-explorer-nav-pane__separator {
  height: 1px;
  margin: 8px 4px;
  background: var(--gnome-explorer-border, rgba(255, 255, 255, 0.08));
}

.gnome-explorer-nav-pane__subsection {
  margin-bottom: 4px;
}
</style>
