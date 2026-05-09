<script setup lang="ts">
defineProps<{
  size?: 'small' | 'large'
}>()
</script>

<template>
  <Button :size="size ?? 'small'" class="p-button--window-nav p-button--icon">
    <slot />
  </Button>
</template>

<style scoped lang="scss">
.p-button > :deep(.iconify) {
  margin-left: -1px;
}
</style>
