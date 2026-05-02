<script setup lang="ts">
import { ref, defineProps, defineEmits, defineExpose } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  fileName: string
  window: IWindowController
}>()

const emit = defineEmits(['open', 'rename'])

const menu = ref<Menu | null>(null)
const items = ref<MenuItem[]>([
  {
    label: t('fs.contextMenu.open'),
    command: () => {
      emit('open', props.fileName)
    },
  },
  {
    label: t('fs.contextMenu.sendTo'),
    command: () => {
      window.alert('To be implemented')
    },
  },
  { separator: true },
  {
    label: t('fs.contextMenu.cut'),
    command: () => {
      props.window.fsExplorer.selectFiles([
        props.fileName,
      ])
      props.window.fsExplorer.cutSelectedFiles()
    },
  },
  {
    label: t('fs.contextMenu.copy'),
    command: () => {
      props.window.fsExplorer.selectFiles([
        props.fileName,
      ])
      props.window.fsExplorer.copySelectedFiles()
    },
  },
  { separator: true },
  {
    label: t('fs.contextMenu.delete'),
    command: () => {
      props.window.fsExplorer.selectFiles([
        `${props.window.fsExplorer.basePath.value}/${props.fileName}`,
      ])
      props.window.fsExplorer.fsController.deleteSelectedFiles()
    },
  },
  {
    label: t('fs.contextMenu.rename'),
    command: () => {
      emit('rename', props.fileName)
    },
  },
  { separator: true },
  {
    label: t('fs.contextMenu.properties'),
    command: () => {
      window.alert('To be implemented')
    },
  },
])

const show = (event: MouseEvent) => {
  event.preventDefault()
  menu.value?.show(event)
}

defineExpose({
  show,
})
</script>

<template>
  <ContextMenu ref="menu" :model="items" />
</template>
