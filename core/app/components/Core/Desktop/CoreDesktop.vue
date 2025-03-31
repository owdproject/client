<script setup lang="ts">
const props = defineProps<{
  systemBar?: SystemBarConfig
  dockBar?: DockBarConfig
}>()

const desktopManager = useDesktopManager()
const applicationManager = useApplicationManager()

// create firsts workspaces if not available
const workspaceStore = useWorkspaceStore()

workspaceStore.$persistedState.isReady().then(() => {
  workspaceStore.setupWorkspaces()
})

// override desktop configurations
desktopManager.overrideConfig({
  systemBar: toRaw(props.systemBar ?? {}),
  dockBar: toRaw(props.dockBar ?? {}),
})

// define apps and restore statuses
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