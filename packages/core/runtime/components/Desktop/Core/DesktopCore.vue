<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppConfig } from 'nuxt/app'
import { computed } from '@vue/reactivity'

defineProps<{
  windows?: DesktopWindowsConfig
  systemBar?: DesktopSystemBarConfig
  dockBar?: DesktopDockBarConfig
  workspaces?: DesktopWorkspacesConfig
}>()

const appConfig = useAppConfig()

onMounted(() => window.addEventListener('resize', handleDesktopResize))
onUnmounted(() => window.removeEventListener('resize', handleDesktopResize))

function handleDesktopResize() {
  //store.dispatch('core/window/windowsAdjustPosition')
}

const classes = computed(() => {
  const list = ['owd-desktop']

  if (appConfig.desktop?.name) {
    list.push(`owd-desktop--${appConfig.desktop.name}`)
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.owd-desktop {
  width: 100vw;
  height: 100dvh;
  user-select: none;
}
</style>
