<script setup lang="ts">

</script>

<template>
  <Card
      class="owd-system-bar__menu"
  >
    <slot />
  </Card>
</template>

<style scoped lang="scss">
.owd-system-bar__menu {
  position: absolute;
  top: calc(var(--owd-system-bar-height) + var(--owd-system-bar-menu-spacing));
  padding: 8px;
}
</style>