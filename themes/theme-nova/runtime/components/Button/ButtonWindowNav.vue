<template>
  <div class="owd-window-nav__button">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-window-nav__button {
  position: relative;
  width: 23px;
  height: 23px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;

  :deep(.iconify) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
    opacity: 0.5;
  }
}
</style>