<script setup>
defineProps({
  icon: { type: String, required: true }
});
</script>

<template>
  <div class="owd-window-nav__icon">
    <Icon :name="icon" :size="18" />
  </div>
</template>

<style scoped>
.iconify {
  vertical-align: -4px;
  margin-left: 7px;
}
</style>
