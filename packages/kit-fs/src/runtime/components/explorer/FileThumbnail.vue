<script setup>
import { onMounted, ref } from "vue";
const props = defineProps({
  fileName: { type: String, required: true },
  path: { type: String, required: true },
  fileHandle: { type: null, required: true }
});
const thumbnail = ref(null);
onMounted(async () => {
  const file = await props.fileHandle.getFile();
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const maxSize = 64;
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    thumbnail.value = canvas.toDataURL("image/jpeg", 0.7);
    URL.revokeObjectURL(img.src);
  };
});
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
.thumbnail{margin:0 auto;max-height:64px;max-width:64px;-o-object-fit:contain;object-fit:contain}
</style>
