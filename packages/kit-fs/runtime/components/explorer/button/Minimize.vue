<script setup lang="ts">
import ChromeButton from './ChromeButton.vue'
</script>

<template>
  <ChromeButton variant="minimize" size="small">
    <div class="owd-button__icon" />
  </ChromeButton>
</template>

<style scoped lang="scss">
/* Centered dash — avoids Win95-era vertical offsets when caption height ≠ 21px */
.owd-button__icon {
  position: relative;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  margin: 0;

  &:before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 11px;
    height: 1px;
    transform: translate(-50%, -50%);
    background: rgb(var(--owd-theme-color-black));
    content: '';
  }
}
</style>
