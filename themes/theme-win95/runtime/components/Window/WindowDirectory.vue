<script setup lang="ts">
import { useFileSystemExplorer } from '@owdproject/module-fs/runtime/composables/useFileSystemExplorer'
import useFsController from '../../../runtime/composables/useFsController'

import WindowDirectoryToolbar from './Directory/WindowDirectoryToolbar.vue'
import WindowDirectoryAddress from './Directory/WindowDirectoryAddress.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  config?: WindowConfig
  window?: IWindowController
}>()

const { t } = useI18n()

const fsExplorer = useFileSystemExplorer(
  props.window,
  useFsController,
  t
)

props.window.fsExplorer = fsExplorer
props.window.fsExplorer.initialize()
</script>

<template>
  <Window v-bind="$props">
    <div class="flex flex-col h-full">
      <div class="flex flex-row items-center">
        <div class="flex-1 overflow-hidden">
          <Menubar breakpoint="false" :model="window.menu" />
        </div>
        <Divider layout="vertical" />

        <div class="bg-black flex items-center text-center" style="height: 26px;">
          <img class="mx-1" style="height: 22px;" src="data:image/gif;base64,R0lGODlhTAAsAIQQAAAAAAAAMAgICBAQEB8fHyAgIAAwMCgoKAAwZwAwmABnmDBnZzBnmDBnzzCYzzCY/7KysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysiH5BAEKABAALAAAAABMACwAAAX+ICCOZGmeaKqubOu+cCzPqCAEQVHQfH/aOJ1vOCMQFIpGg8FAOBE2onRlRCqZT6hgSjQ6F4tEgvl4IKMAmxfBHa7BYrJZgVYTnO2ZwaAs+/9+Snglg3kwe32AioJshI2GLUh/TJKKgExohZArlWWUCpaXDJmPmyhyDg5ZqaGKSDqapiaoqk+srX+vBbGyIntlSjYHB5NNCHKhSAMDvSa/D8ECw8VOyJbKzM0kVwy+Bn9CJdZ/Stom3N7gO+IMoeXmIstIIjh/qTh7ezidlkbw8groBbDnAF++faBa+YM3wsYtXBD98NLm0EHEiw8mNuOHEZfGXhw7hvq4qZ6lVHu3nAxzkq9lvmEL4ZlUhNKAygMsXbaESYAhgHGA0JAYxo2JEmw+gf4ROoLoEiYMjipYBu8ZLiVUAVg96cDnVncNsn4FlCppuwcPW6UNhcNsmbVcI7ZlqORegEQi/+xhqq1uwbsN8gLau4Vhqnc2kMANZZevucMNRCRWsJgrDsfaKu2RLMAJN7/cNvs8odkAZ89PQT8VPbqEjkRQjWXF3PrE68APYjuZXbj2CyNZfbshEFy48ePIR4QAADs=" />
        </div>
      </div>

      <Divider />

      <WindowDirectoryToolbar
        :arrows-disabled="fsExplorer.fsDirectoryNavigation.history.value.length <= 1"
        @back="fsExplorer.directoryBack"
        @forward="fsExplorer.directoryForward"
        @up="fsExplorer.directoryUp"
        @cut="fsExplorer.cutSelectedFiles"
        @copy="fsExplorer.copySelectedFiles"
        @paste="fsExplorer.fsController.pasteClipboardFiles"
        @delete="fsExplorer.fsController.deleteSelectedFiles"
        @undo="fsExplorer.operationUndo"
        @properties="fsExplorer.fileProperties"
      />

      <Divider />

      <WindowDirectoryAddress
        :address="fsExplorer.basePath.value"
        @update:modelValue="value => fsExplorer.basePath.value = value"
      />

      <Divider />

      <div class="flex-1 overflow-auto">
        <DataTable class="h-full">

          <SelectableArea
            v-if="!window.meta.path.startsWith('http')"
            :fs-explorer="fsExplorer"
          >
            <FileSystemFile
              v-for="fileName of fsExplorer.fsEntries.value"
              :key="fileName"
              :data-filename="fileName"
              :basePath="fsExplorer.basePath.value"
              :fileName="fileName"
              :layout="fsExplorer.layout.value"
              :selected="fsExplorer.selectedFiles.value.includes(`${fsExplorer.basePath.value}/${fileName}`)"
              :cutted="fsExplorer.fsClipboard.clipboardFiles.value.includes(`${fsExplorer.basePath.value}/${fileName}`) && fsExplorer.fsClipboard.clipboardType.value === 'cut'"
              :window="window"
            />
          </SelectableArea>
          <iframe
            v-else
            :src="window.meta.path"
          />

        </DataTable>
      </div>
    </div>
  </Window>
</template>

<style scoped lang="scss">
.h-full {
  overflow-x: hidden;
}

iframe {
  width: 100%;
  height: 100%;
}

:deep(.owd-window:not(.owd-window--focused)) {
  iframe {
    pointer-events: none;
  }
}
</style>
