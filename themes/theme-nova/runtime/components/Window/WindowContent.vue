<template>
  <CoreWindowContent>
    <slot />
  </CoreWindowContent>
</template>

<style scoped lang="scss">
.owd-window__content {


  &--centered {
    align-content: center;
  }

  &--padded {
    padding: var(--owd-card-body-padding);
  }
}
</style>