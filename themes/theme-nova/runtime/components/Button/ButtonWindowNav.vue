<template>
  <div class="owd-window-nav__button">
    <slot />
  </div>
</template>

<style scoped lang="scss">
/* Sizing only — hover/focus colors in window-chrome.scss */
.owd-window-nav__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--nova-window-control-size, 28px);
  height: var(--nova-window-control-size, 28px);
  padding: 0;
  cursor: pointer;

  :deep(.iconify) {
    position: relative;
    pointer-events: none;
  }
}
</style>
