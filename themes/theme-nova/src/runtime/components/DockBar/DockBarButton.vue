<script setup lang="ts">

</script>

<template>
  <div class="owd-dock-bar__button">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-dock-bar__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>