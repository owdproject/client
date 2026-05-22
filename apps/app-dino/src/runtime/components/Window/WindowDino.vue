<script setup lang="ts">
import {createDino} from "../../lib/index.js"

const props = defineProps<{
  window: any
}>()

const dinoContainer = useTemplateRef('container')

onMounted(() => {
  createDino(
    props.window,
    dinoContainer.value,
  )
})
</script>

<template>
  <Window v-bind="$props" :content="{ padded: false }">
    <div ref="container" />
  </Window>
</template>

<style scoped lang="scss">
:deep(canvas) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
