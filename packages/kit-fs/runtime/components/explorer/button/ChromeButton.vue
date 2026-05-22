<script setup lang="ts">
defineProps<{
  size?: 'small' | 'large'
  /** Lets themes target minimize / maximize / close without fragile nth-child. */
  variant?: 'minimize' | 'maximize' | 'close'
}>()
</script>

<template>
  <Button
    :size="size ?? 'small'"
    :class="[
      'p-button--window-nav',
      'p-button--icon',
      variant ? `p-button--window-nav-${variant}` : '',
    ]"
  >
    <slot />
  </Button>
</template>

<style scoped lang="scss">
.p-button > :deep(.iconify) {
  margin-left: -1px;
}
</style>
