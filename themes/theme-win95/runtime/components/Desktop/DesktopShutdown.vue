<script setup lang="ts">
defineProps<{
  active: boolean
}>()
</script>

<template>
  <div :class="['owd-shutdown', { 'owd-shutdown--active': active }]" />
</template>

<style scoped lang="scss">
.owd-shutdown {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  border: 0 solid black;
  transition: border-spacing 0.2s ease-in;
  pointer-events: none;
  will-change: border;
  z-index: 99999999999;

  &--active {
    animation: normal 0.3s turn-off;
    animation-fill-mode: forwards;
  }
}

@keyframes turn-off {
  35% {
    background: white;
  }
  65% {
    background: white;
    border: 5vh solid black;
    border-top: 49vh solid black;
    border-bottom: 49vh solid black;
  }
  99% {
    background: white;
    border: 51vh solid black;
  }
  100% {
    background: black;
    border: 51vh solid black;
  }
}
</style>
