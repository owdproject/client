<script setup lang="ts"></script>

<template>
  <div class="owd-dock-bar__button">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-dock-bar__button {
  position: relative;
  display: inline-block;
  width: var(--p-dock-bar-button-size);
  height: var(--p-dock-bar-button-size);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0);
  transition: background 0.2s;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  :deep(.iconify) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
