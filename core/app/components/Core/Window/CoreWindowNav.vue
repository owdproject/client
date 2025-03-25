<script setup lang="ts">
const windowController = inject<IWindowController>('windowController')

const classes = computed(() => {
  const list = ['owd-window-nav']

  if (typeof windowController?.state.active === 'undefined' || !!windowController?.state.active) {
    list.push('owd-window-nav--active')
  }

  if (typeof windowController?.state.focused === 'undefined' || !!windowController?.state.focused) {
    list.push('owd-window-nav--focused')
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <div class="owd-window-nav__draggable"/>

    <slot/>

  </div>
</template>

<style lang="scss">
.owd-window-nav {
  position: relative;

  &__draggable {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
  }
}
</style>
