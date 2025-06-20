<script setup lang="ts">
import { onBeforeMount, onMounted, onUnmounted } from 'vue'
import { useAppConfig, useRuntimeConfig } from 'nuxt/app'
import { ref, computed, toRaw } from '@vue/reactivity'
import { useApplicationManager } from '../../../composables/useApplicationManager'
import { useDesktopManager } from '../../../composables/useDesktopManager'
import { useDesktopStore } from '../../../stores/storeDesktop'
import { useDesktopDefaultAppsStore } from '../../../stores/storeDesktopDefaultApps'
import { useDesktopWorkspaceStore } from '../../../stores/storeDesktopWorkspace'

const props = withDefaults(
  defineProps<{
    windows?: DesktopWindowsConfig
    systemBar?: DesktopSystemBarConfig
    dockBar?: DesktopDockBarConfig
    workspaces?: DesktopWorkspacesConfig
  }>(),
  {
    windows: {
      position: 'fixed',
    },
    systemBar: {},
    dockBar: {},
    workspaces: {},
  },
)

// todo move to owd initialization

const ready = ref(false)

const appConfig = useAppConfig()
const desktopManager = useDesktopManager()
const applicationManager = useApplicationManager()
const runtimeConfig = useRuntimeConfig()

// create firsts workspaces if not available
const desktopStore = useDesktopStore()
const desktopWorkspaceStore = useDesktopWorkspaceStore()

if (desktopStore.$persistedState) {
  desktopStore.$persistedState.isReady().then(() => {
    desktopWorkspaceStore.setupWorkspaces()
  })
} else {
  desktopWorkspaceStore.setupWorkspaces()
}

// override desktop configurations
desktopManager.setConfig({
  windows: toRaw(props.windows),
  systemBar: toRaw(props.systemBar),
  dockBar: toRaw(props.dockBar),
  workspaces: toRaw(props.workspaces),
})

// desktop resize
// todo move to composable

onMounted(() => window.addEventListener('resize', handleDesktopResize))
onUnmounted(() => window.removeEventListener('resize', handleDesktopResize))

function handleDesktopResize() {
  //store.dispatch('core/window/windowsAdjustPosition')
}

const classes = computed(() => {
  const list = ['owd-desktop']

  list.push(`owd-desktop--${appConfig.desktop.name}`)

  return list
})

onBeforeMount(() => {
  useDesktopDefaultAppsStore().loadDefaultAppsFromConfig()
  ready.value = true
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
