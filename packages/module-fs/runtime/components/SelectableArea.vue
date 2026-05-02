<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from 'vue'
import { VueSelecto } from 'vue3-selecto'

const props = defineProps<{
  fsExplorer: any
}>()

const selectoContainer = useTemplateRef('selectoContainer')
const windowContentContainer = ref()

const container = document.body

const files = ref<string[]>([])

function onSelect(e) {
  e.added.forEach(el => {
    files.value.push(el.getAttribute('data-filename'))
    props.fsExplorer.selectFiles(files.value)
  })

  e.removed.forEach(el => {
    const fileIndex = files.value.indexOf(el.getAttribute('data-filename'))

    if (fileIndex > -1) {
      files.value.splice(fileIndex, 1)
    }

    props.fsExplorer.selectFiles(files.value)
  })
}

onMounted(() => {
  windowContentContainer.value = selectoContainer.value.closest('.owd-window__content')
})
</script>

<template>
  <div class="h-full" ref="selectoContainer">
    <VueSelecto
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
