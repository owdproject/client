<script setup>
defineProps({
  size: { type: String, required: false },
  variant: { type: String, required: false }
});
</script>

<template>
  <Button
    :size="size ?? 'small'"
    :class="[
  'p-button--window-nav',
  'p-button--icon',
  variant ? `p-button--window-nav-${variant}` : ''
]"
  >
    <slot />
  </Button>
</template>

<style scoped>
.p-button > :deep(.iconify) {
  margin-left: -1px;
}
</style>
