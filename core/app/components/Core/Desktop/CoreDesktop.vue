<script setup lang="ts">
const props = defineProps<{
  systemBar?: SystemBarConfig
  dockBar?: DockBarConfig
}>()

const desktop = useDesktopManager()

desktop.overrideConfig({
  systemBar: toRaw(props.systemBar ?? {}),
  dockBar: toRaw(props.dockBar ?? {}),
})

applicationManager.importApps()

// desktop resize
// todo move to composable

onMounted(() => window.addEventListener('resize', handleDesktopResize))
onUnmounted(() => window.removeEventListener('resize', handleDesktopResize))

function handleDesktopResize() {
  //store.dispatch('core/window/windowsAdjustPosition')
}
</script>

<template>
  <div class="owd-desktop">
    <slot/>
  </div>
</template>

<style scoped lang="scss">
.owd-desktop {
  width: 100vw;
  height: 100dvh;
  user-select: none;
}
</style>