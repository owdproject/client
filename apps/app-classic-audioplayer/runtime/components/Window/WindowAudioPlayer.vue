<script setup lang="ts">
import { fs } from '@zenfs/core'
import { getFilename } from '@owdproject/module-fs/runtime/utils/utilFileSystem'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'

const props = defineProps<{
  window: IWindowController
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
const audioSrc = ref<string | undefined>()
let objectUrl: string | undefined

const trackPath = computed(() => props.window.meta?.path as string | undefined)

const title = computed(() => getFilename(trackPath.value ?? ''))

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
  }
}

function loadAudioUrl(pathString?: string): string | undefined {
  revokeObjectUrl()

  if (!pathString) {
    return undefined
  }

  if (/^https?:\/\//i.test(pathString)) {
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

    let mimeType: string | undefined

    switch (ext) {
      case '.mp3':
        mimeType = 'audio/mpeg'
        break
      case '.wav':
        mimeType = 'audio/wav'
        break
      default:
        console.warn(`File is not supported: ${ext}`)
        return undefined
    }

    const blob = new Blob([buffer], { type: mimeType })
    objectUrl = URL.createObjectURL(blob)
    return objectUrl
  } catch (err) {
    console.error('Error while loading the audio', err)
    return undefined
  }
}

async function applyTrack() {
  audioSrc.value = loadAudioUrl(trackPath.value)
  props.window.actions.setTitleOverride(title.value)

  await nextTick()
  const el = audioRef.value
  if (!el || !audioSrc.value) return

  el.load()
  if (props.window.meta?.autoplay) {
    try {
      await el.play()
    } catch {
      /* autoplay blocked or missing source */
    }
  }
}

watch(trackPath, () => {
  void applyTrack()
}, { immediate: true })

watch(
  () => props.window.meta?.autoplay,
  async (autoplay) => {
    const el = audioRef.value
    if (!el || !audioSrc.value) return
    if (autoplay) {
      try {
        await el.play()
      } catch {
        /* ignore */
      }
    } else {
      el.pause()
    }
  },
)

onBeforeUnmount(() => {
  revokeObjectUrl()
})
</script>

<template>
  <Frame :window="props.window" :chrome-padding="false">
    <audio
      ref="audioRef"
      :key="trackPath ?? ''"
      :src="audioSrc"
      :controls="!props.window.meta?.noControls"
      :loop="Boolean(props.window.meta?.loop)"
      class="m-2 block w-full max-w-full"
    />
  </Frame>
</template>
