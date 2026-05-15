<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import DataTable from 'primevue/datatable'
import Win11ExplorerItemContextMenu from './Win11ExplorerItemContextMenu.vue'
import Win11ExplorerFileIcon from './Win11ExplorerFileIcon.vue'
import { inject } from 'vue'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'

defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()

const openPathInNewTab = inject<(path: string) => void>(
  'win11ExplorerOpenPathInNewTab',
  undefined,
)
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

/* Denser grid than the old “airy” pass — still slightly roomier than kit-fs base */
.win11-explorer-content-pane :deep(.owd-file) {
  margin: 8px 10px;
}

.win11-explorer-content-pane :deep(.owd-file > .flex.items-center) {
  padding: 6px 8px;
  justify-content: center;
}

.win11-explorer-content-pane :deep(.owd-file--size-smallIcons) {
  margin: 10px 12px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons) {
  width: 100px;
  margin: 14px 16px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons > .flex.items-center) {
  padding: 10px 12px;
}

.win11-explorer-content-pane :deep(.owd-file--size-largeIcons .truncate) {
  max-width: 116px;
}

.win11-explorer-content-pane :deep(.owd-file--size-list),
.win11-explorer-content-pane :deep(.owd-file--size-details) {
  display: block;
  width: 100%;
  margin: 0;
  padding-left: 6px;
  padding-right: 6px;
  box-sizing: border-box;
}
</style>
