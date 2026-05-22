<script setup lang="ts">
import { ref, onMounted, useTemplateRef, computed } from 'vue'
import { VueSelecto } from 'vue3-selecto'
import { useExplorerExternalDrop } from '../composables/useExplorerExternalDrop'

const props = defineProps<{
  fsExplorer: {
    selectFiles: (names: string[]) => void
    basePath: { value: string }
    fsController?: {
      importDroppedExternalFiles?: (entries: unknown[], targetDirectory?: string) => Promise<void>
      moveDroppedVfsPaths?: (paths: string[], targetDirectory?: string) => Promise<void>
    }
  }
  /** Disable OS drag-and-drop import (e.g. HTTP iframe panes). */
  dropEnabled?: boolean
}>()

const dropEnabled = computed(() => props.dropEnabled ?? true)

const { isDragOver, onDragEnter, onDragOver, onDragLeave, onDrop } =
  useExplorerExternalDrop(props.fsExplorer, {
    enabled: () => dropEnabled.value,
  })

const selectoContainer = useTemplateRef('selectoContainer')
const windowContentContainer = ref<HTMLElement | undefined>()

const container = typeof document !== 'undefined' ? document.body : undefined

const files = ref<string[]>([])

function onSelect(e: {
  added: Element[]
  removed: Element[]
}) {
  e.added.forEach((el) => {
    const name = el.getAttribute('data-filename')
    if (name) files.value.push(name)
    props.fsExplorer.selectFiles(files.value)
  })

  e.removed.forEach((el) => {
    const name = el.getAttribute('data-filename')
    if (!name) return
    const fileIndex = files.value.indexOf(name)

    if (fileIndex > -1) {
      files.value.splice(fileIndex, 1)
    }

    props.fsExplorer.selectFiles(files.value)
  })
}

onMounted(() => {
  const root = selectoContainer.value
  if (root) {
    windowContentContainer.value =
      (root.closest('.owd-window__content') as HTMLElement | null) ?? undefined
  }
})
</script>

<template>
  <div
    class="kit-fs-explorer-dropzone h-full"
    :class="{ 'kit-fs-explorer-dropzone--active': isDragOver }"
    ref="selectoContainer"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <VueSelecto
      v-if="container && windowContentContainer"
      :rootContainer="windowContentContainer"
      :dragContainer="windowContentContainer"
      :selectableTargets='[".owd-file"]'
      :selectByClick="true"
      :selectFromInside="true"
      :continueSelect="false"
      toggleContinueSelect="ctrl"
      :keyContainer="container"
      :hitRate="60"
      @select="onSelect"
    />

    <slot />
  </div>
</template>

<style scoped lang="scss">
.kit-fs-explorer-dropzone--active {
  outline: 2px dashed var(--owd-explorer-drop-outline, var(--p-primary-color, #3b82f6));
  outline-offset: -2px;
  background: var(
    --owd-explorer-drop-surface,
    color-mix(in srgb, var(--owd-explorer-drop-outline, var(--p-primary-color, #3b82f6)) 8%, transparent)
  );
}
</style>
