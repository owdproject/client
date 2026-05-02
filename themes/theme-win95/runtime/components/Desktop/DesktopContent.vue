<script setup lang="ts">
import { useSystemBar } from '../../composables/useSystemBar'
import { computed } from '@vue/reactivity'

const systemBar = useSystemBar()

const classes = computed(() => {
  const list = ['owd-desktop__content']

  if (systemBar.position.value) {
    list.push(
      `owd-desktop__content--system-bar-position-${systemBar.position.value}`,
    )
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
.owd-desktop__content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &--system-bar-position-top {
    height: calc(100% - var(--owd-system-bar-height));
    top: var(--owd-system-bar-height);
  }

  &--system-bar-position-bottom {
    height: calc(100% - var(--owd-system-bar-height));
  }
}
</style>
