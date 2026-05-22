<script setup lang="ts">

</script>

<template>
  <Button icon>
    <div class="owd-button__icon" />
  </Button>
</template>

<style scoped lang="scss">
.owd-button__icon {
  width: 12px;
  height: 14px;
  top: 15px;
  left: 6px;
  position: relative;

  &:before {
    position: absolute;
    background: rgb(10, 10, 10);
    content: "";
  }

  &:before {
    width: 100%;
    height: 3px;
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>