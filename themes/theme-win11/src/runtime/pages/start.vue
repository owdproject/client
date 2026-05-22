<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core'
import { watch } from 'vue'
import { navigateTo } from 'nuxt/app'

const { enter } = useMagicKeys()

watch(enter, (v) => {
  if (v) navigateTo('/boot')
})
</script>

<template>
  <div class="owd-powered-off" />
</template>

<style scoped lang="scss">
.owd-powered-off {
  position: fixed;
  background: black;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
