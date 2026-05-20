<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import DataTable from 'primevue/datatable'
import GnomeExplorerItemContextMenu from './GnomeExplorerItemContextMenu.vue'
import GnomeExplorerFileIcon from './GnomeExplorerFileIcon.vue'
import { openVfsFile } from '@owdproject/module-fs/runtime/utils/utilFsOpenFile'
import type { useGnomeExplorerPlaces } from '../../composables/useGnomeExplorerPlaces'
import { computed, inject } from 'vue'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()

const places = inject<ReturnType<typeof useGnomeExplorerPlaces>>('gnomeExplorerPlaces')

const placeView = computed(
  () => props.window.meta?.gnomePlaceView as string | undefined,
)

const browsePath = computed(
  () =>
    String(props.window.meta?.path ?? props.fsExplorer.basePath.value ?? '').trim(),
)

const isWebUrl = computed(() => /^https?:\/\//i.test(browsePath.value))

const openPathInNewTab = inject<(path: string) => void>(
  'gnomeExplorerOpenPathInNewTab',
  undefined,
)

type VirtualRow = { name: string; path: string; isDirectory: boolean }

const virtualEntries = computed((): VirtualRow[] => {
  if (!places) return []
  if (placeView.value === 'recent') {
    return places.recentFiles.value.map((e) => ({
      name: e.name,
      path: e.path,
      isDirectory: false,
    }))
  }
  if (placeView.value === 'starred') {
    return places.starredEntries.value.map((e) => ({
      name: e.name,
      path: e.path,
      isDirectory: false,
    }))
  }
  if (placeView.value === 'network') {
    return places.networkVolumes.value.map((v) => ({
      name: v.label,
      path: v.path,
      isDirectory: true,
    }))
  }
  return []
})

const directoryEntries = computed(() => props.fsExplorer.fsEntries.value)

const showVirtual = computed(
  () => placeView.value === 'recent' || placeView.value === 'starred' || placeView.value === 'network',
)

async function onVirtualOpen(row: VirtualRow) {
  if (row.isDirectory) {
    places?.selectPlace('folder', row.path)
    props.window.meta = { ...props.window.meta, gnomePlaceView: null }
    props.fsExplorer.basePath.value = row.path
    await props.fsExplorer.navigateToDirectory(row.path)
    return
  }
  const opened = await openVfsFile(row.path)
  if (!opened) {
    const parent = row.path.replace(/\/[^/]+$/, '') || '/'
    places?.selectPlace('folder', parent)
    props.window.meta = { ...props.window.meta, gnomePlaceView: null }
    await props.fsExplorer.navigateToDirectory(parent)
  }
}
</script>

<template>
  <div class="gnome-explorer-content-pane">
    <DataTable class="gnome-explorer-content-pane__table h-full">
      <div
        v-if="showVirtual"
        class="gnome-explorer-content-pane__virtual-grid"
      >
        <button
          v-for="row in virtualEntries"
          :key="row.path"
          type="button"
          class="gnome-explorer-content-pane__virtual-item"
          @dblclick="onVirtualOpen(row)"
        >
          <GnomeExplorerFileIcon
            :file-name="row.name"
            :is-directory="row.isDirectory"
            :layout="fsExplorer.layout.value"
          />
          <span class="gnome-explorer-content-pane__virtual-label">{{ row.name }}</span>
        </button>
      </div>
      <KitFsExplorerSelectableArea
        v-else-if="!String(window.meta.path ?? '').startsWith('http')"
        :fs-explorer="fsExplorer"
        :drop-enabled="!isWebUrl"
      >
        <KitFsExplorerFileEntry
          v-for="fileName of directoryEntries"
          :key="fileName"
          :data-filename="fileName"
          :basePath="fsExplorer.basePath.value"
          :fileName="fileName"
          :layout="fsExplorer.layout.value"
          :selected="
            fsExplorer.selectedFiles.value.includes(
              explorerEntryAbsolutePath(
                fsExplorer.basePath.value,
                fileName,
              ),
            )
          "
          :cutted="
            fsExplorer.fsClipboard.clipboardFiles.value.includes(
              explorerEntryAbsolutePath(
                fsExplorer.basePath.value,
                fileName,
              ),
            ) && fsExplorer.fsClipboard.clipboardType.value === 'cut'
          "
          :window="window"
          :open-path-in-new-tab="openPathInNewTab"
          :contextMenuComponent="GnomeExplorerItemContextMenu"
        >
          <template #icon="{ fileName: iconFileName, isDirectory, layout }">
            <GnomeExplorerFileIcon
              :file-name="iconFileName"
              :is-directory="isDirectory"
              :layout="layout"
            />
          </template>
        </KitFsExplorerFileEntry>
      </KitFsExplorerSelectableArea>
      <div v-else class="gnome-explorer-content-pane__webview">
        <iframe
          class="gnome-explorer-content-pane__iframe"
          :class="{ 'pointer-events-none': !window.state.focused }"
          :src="browsePath"
        />
      </div>
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-content-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--gnome-explorer-content-bg, #2e2e2e);
}

.gnome-explorer-content-pane__virtual-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  align-content: flex-start;
}

.gnome-explorer-content-pane__virtual-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 96px;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
  cursor: default;

  &:hover {
    background: var(--gnome-explorer-selection-bg, rgba(255, 255, 255, 0.08));
  }
}

.gnome-explorer-content-pane__virtual-label {
  font-size: 12px;
  text-align: center;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gnome-explorer-content-pane__webview {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-height: 12rem;
  height: 100%;
}

.gnome-explorer-content-pane__iframe {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
}

.gnome-explorer-content-pane :deep(.p-datatable-table-container),
.gnome-explorer-content-pane :deep(.p-datatable-wrapper) {
  height: 100%;
}

.gnome-explorer-content-pane__table {
  background: transparent;
}

.gnome-explorer-content-pane :deep(.owd-file) {
  margin: 8px 10px;
}

.gnome-explorer-content-pane :deep(.owd-file > .flex.items-center) {
  padding: 6px 8px;
  justify-content: center;
}

.gnome-explorer-content-pane :deep(.owd-file--size-largeIcons) {
  width: 100px;
  margin: 14px 16px;
}
</style>
