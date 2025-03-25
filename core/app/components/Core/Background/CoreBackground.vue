<template>
  <div class="owd-background">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--owd-background-color);
  z-index: -1;
}
</style>