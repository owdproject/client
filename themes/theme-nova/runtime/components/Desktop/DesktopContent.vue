<script setup lang="ts">
import { useAppConfig } from 'nuxt/app'
import { computed } from 'vue'

const appConfig = useAppConfig()

const classes = computed(() => {
  const list = ['owd-desktop__content']
  const pos = appConfig.desktop?.systemBar?.position
  if (pos) {
    list.push(`owd-desktop__content--system-bar-position-${pos}`)
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
