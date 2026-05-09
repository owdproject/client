<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  density?: string
}>()

const classes = computed(() => {
  const list = ['owd-list']

  if (props.density) {
    list.push(`owd-list--density-${props.density}`)
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-list {
  width: 100%;
  text-align: left;
}
</style>
