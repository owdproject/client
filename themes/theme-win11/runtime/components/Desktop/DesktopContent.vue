<script setup lang="ts">
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import { computed } from '@vue/reactivity'

const shell = useDesktopShellOptions()

const classes = computed(() => {
  const list = ['owd-desktop__content']

  if (shell.systemBarPosition.value) {
    list.push(
      `owd-desktop__content--system-bar-position-${shell.systemBarPosition.value}`,
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
