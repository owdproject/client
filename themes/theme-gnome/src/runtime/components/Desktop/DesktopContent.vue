<script setup lang="ts">
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { useSystemBar } from '../../composables/useSystemBar'
import { computed } from 'vue'

const desktop = useDesktopManager()
const systemBar = useSystemBar()

const classes = computed(() => {
  const list = ['owd-desktop__content']

  if (systemBar?.position.value) {
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
  }
}
</style>
