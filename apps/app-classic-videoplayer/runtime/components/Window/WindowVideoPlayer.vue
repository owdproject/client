<script setup lang="ts">
import { fs } from '@zenfs/core'
import { useI18n } from 'vue-i18n'
import { getFilename } from '@owdproject/module-fs/runtime/utils/utilFileSystem'
import { ref } from 'vue'

const props = defineProps<{
  window: Window
}>()

const { t } = useI18n()

const filePath = loadVideoUrl(props.window.meta.path)
const title = ref(getFilename(props.window.meta.path))

props.window.setTitleOverride(title)

function loadVideoUrl(pathString: string) {
  if (!pathString) {
    return
  }

  if (pathString.startsWith('http')) {
    return pathString
  }

  try {
    const buffer = fs.readFileSync(pathString)
    const lastDotIndex = pathString.lastIndexOf('.')
    const lastSlashIndex = pathString.lastIndexOf('/')
    let ext = ''
    if (lastDotIndex > lastSlashIndex) {
      ext = pathString.substring(lastDotIndex).toLowerCase()
    }

    let mimeType

    switch (ext) {
      case '.mp4':
        mimeType = 'video/mp4'
        break
      case '.webm':
        mimeType = 'video/webm'
        break
      default:
        console.warn(`File is not supported: ${ext}`)
        return
    }

    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
  } catch (err) {
    console.error('Error while loading the audio', err)
    return
  }
}
</script>

<template>
  <Window v-bind="$props">
    <video
      :src="filePath"
      :controls="!props.window.meta.noControls"
      :autoplay="props.window.meta.autoplay"
      :loop="props.window.meta.loop"
    />
  </Window>
</template>

<style scoped lang="scss">
video {
  width: 100%;
  max-width: 60vw;
  max-height: 60vh;
}
</style>
