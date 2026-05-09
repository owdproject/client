<script setup lang="ts">
defineProps<{
  icon: string
}>()
</script>

<template>
  <div class="owd-window-nav__icon">
    <Icon :name="icon" :size="18" />
  </div>
</template>

<style scoped lang="scss">
.iconify {
  vertical-align: -4px;
  margin-left: 7px;
}
</style>
