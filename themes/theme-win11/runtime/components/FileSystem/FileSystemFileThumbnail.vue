<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  fileName: string
  path: string
}>()

const thumbnail = ref<string | null>(null)

onMounted(async () => {
  const file = await props.fileHandle.getFile()
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  const img = new Image()
  img.src = URL.createObjectURL(file)

  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const maxSize = 64

    const scale = Math.min(maxSize / img.width, maxSize / img.height)
    canvas.width = img.width * scale
    canvas.height = img.height * scale

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    thumbnail.value = canvas.toDataURL('image/jpeg', 0.7)
    URL.revokeObjectURL(img.src)
  }
})
</script>

<template>
  <img
    v-if="thumbnail"
    :src="thumbnail"
    class="thumbnail"
    alt="Preview"
    draggable="false"
  />
</template>

<style scoped>
.thumbnail {
  max-width: 64px;
  max-height: 64px;
  object-fit: contain;
  margin: 0 auto;
}
</style>
