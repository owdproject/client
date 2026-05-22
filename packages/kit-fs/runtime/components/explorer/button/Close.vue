<script setup lang="ts">
import ChromeButton from './ChromeButton.vue'
</script>

<template>
  <ChromeButton variant="close" size="small">
    <div class="owd-button__icon" />
  </ChromeButton>
</template>

<style scoped lang="scss">
/* 45° X centered in the caption button — no negative margins (those targeted Win95 21px chrome) */
.owd-button__icon {
  position: relative;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  margin: 0;
  transform: rotate(45deg);

  &:before,
  &:after {
    position: absolute;
    background: rgb(var(--owd-theme-color-black));
    content: '';
  }

  &:before {
    height: 100%;
    width: 1.5px;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
  }

  &:after {
    height: 1.5px;
    width: 100%;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
