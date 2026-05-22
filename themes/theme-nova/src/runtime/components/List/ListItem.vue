<script setup lang="ts">

</script>

<template>
  <div class="owd-list-item">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-list-item {
  width: 100%;
  cursor: pointer;
  padding: 8px 16px;

  &:hover {
    background: var(--owd-elevation-inactive);
  }
}
</style>