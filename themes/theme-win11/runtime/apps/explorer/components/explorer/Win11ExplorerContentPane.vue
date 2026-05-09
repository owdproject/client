<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import DataTable from 'primevue/datatable'
import Win11ExplorerItemContextMenu from './Win11ExplorerItemContextMenu.vue'
import Win11ExplorerFileIcon from './Win11ExplorerFileIcon.vue'

defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()
</script>

<template>
  <div class="win11-explorer-content-pane">
    <DataTable class="win11-explorer-content-pane__table h-full">
      <KitFsExplorerSelectableArea
        v-if="!String(window.meta.path ?? '').startsWith('http')"
        :fs-explorer="fsExplorer"
      >
        <KitFsExplorerFileEntry
          v-for="fileName of fsExplorer.fsEntries.value"
          :key="fileName"
          :data-filename="fileName"
          :basePath="fsExplorer.basePath.value"
          :fileName="fileName"
          :layout="fsExplorer.layout.value"
          :selected="
            fsExplorer.selectedFiles.value.includes(
              `${fsExplorer.basePath.value}/${fileName}`,
            )
          "
          :cutted="
            fsExplorer.fsClipboard.clipboardFiles.value.includes(
              `${fsExplorer.basePath.value}/${fileName}`,
            ) && fsExplorer.fsClipboard.clipboardType.value === 'cut'
          "
          :window="window"
          :contextMenuComponent="Win11ExplorerItemContextMenu"
        >
          <template #icon="{ fileName: iconFileName, isDirectory, layout }">
            <Win11ExplorerFileIcon
              :file-name="iconFileName"
              :is-directory="isDirectory"
              :layout="layout"
            />
          </template>
        </KitFsExplorerFileEntry>
      </KitFsExplorerSelectableArea>
      <iframe
        v-else
        class="win11-explorer-content-pane__iframe"
        :src="window.meta.path ?? ''"
      />
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.win11-explorer-content-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.win11-explorer-content-pane__iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.win11-explorer-content-pane__table {
  background: transparent;
}

/* Airy grid like Win11 Home / Quick access — wider gaps than kit-fs defaults */
.win11-explorer-content-pane :deep(.owd-file) {
  margin: 16px 20px;
}

.win11-explorer-content-pane :deep(.owd-file > .flex.items-center) {
  padding: 12px 14px;
  justify-content: center;
}

.win11-explorer-content-pane :deep(.owd-file--size-smallIcons) {
  margin: 20px 26px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons) {
  width: 108px;
  margin: 28px 36px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons > .flex.items-center) {
  padding: 16px 18px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons .truncate) {
  max-width: 124px;
}

/* List / details stay a bit tighter (row-style) */
.win11-explorer-content-pane :deep(.owd-file--size-list),
.win11-explorer-content-pane :deep(.owd-file--size-details) {
  margin: 8px 14px;
}
</style>
