<script setup lang="ts">
import { onMounted, onUnmounted, useAttrs, computed } from 'vue'
import { useAppConfig } from 'nuxt/app'

defineOptions({ inheritAttrs: false })

defineProps<{
  windows?: DesktopWindowsConfig
  systemBar?: DesktopSystemBarConfig
  dockBar?: DesktopDockBarConfig
  workspaces?: DesktopWorkspacesConfig
}>()

const appConfig = useAppConfig()
const attrs = useAttrs()

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

const rootClass = computed(() => [classes.value, attrs.class])
const rootStyle = computed(() => attrs.style)
</script>

<template>
  <div :class="rootClass" :style="rootStyle">
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
