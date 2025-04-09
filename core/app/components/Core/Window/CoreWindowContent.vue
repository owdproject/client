<script setup lang="ts">
const windowContent = inject<WindowContent>('windowContent')

const classes = computed(() => {
  const list = ['owd-window__content']

  if (windowContent?.centered) {
    list.push('owd-window__content--centered')
  }

  if (windowContent?.padded) {
    list.push('p-2')
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

</style>