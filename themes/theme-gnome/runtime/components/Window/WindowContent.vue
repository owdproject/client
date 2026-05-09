<template>
  <CoreWindowContent>
    <slot />
  </CoreWindowContent>
</template>

<style scoped lang="scss">
.owd-window__content {
  display: block;
  flex: 1;

  &--centered {
    align-content: center;
  }

  &--padded {
    padding: 16px;
  }
}
</style>
