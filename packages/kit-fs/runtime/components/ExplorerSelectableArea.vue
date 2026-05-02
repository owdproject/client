<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from 'vue'
import { VueSelecto } from 'vue3-selecto'

const props = defineProps<{
  fsExplorer: {
    selectFiles: (names: string[]) => void
  }
}>()

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
  <div class="h-full" ref="selectoContainer">
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
