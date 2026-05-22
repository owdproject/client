<template>
  <CoreWindowContent>
    <slot />
  </CoreWindowContent>
</template>

<style scoped lang="scss">
.owd-window__content {
  display: block;
  flex: 1;
  position: relative;
  min-height: 0;

  &--centered {
    align-content: center;
    height: 100%;
  }

  &--padded {
    padding: var(--owd-card-body-padding, 8px);
  }
}
</style>
