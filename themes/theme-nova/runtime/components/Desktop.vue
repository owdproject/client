<script setup lang="ts">
import { useAppConfig } from 'nuxt/app'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import NovaTopBar from './NovaTopBar.vue'
import NovaLauncherOverlay from './NovaLauncherOverlay.vue'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import { useNovaAccentTheme } from '../composables/useNovaAccentTheme'

const { open: startMenuOpen, useFullscreenLauncher } = useNovaStartMenu()
const { accentId } = useNovaAccentTheme()

const props = defineProps<{
  systemBar?: DesktopSystemBarConfig
}>()

const appConfig = useAppConfig()
const desktopWorkspaceStore = useDesktopWorkspaceStore()
</script>

<template>
  <CoreDesktop
      v-bind="$props"
      :class="{
        'owd-desktop--overview-enabled': desktopWorkspaceStore.overview
    }"
      :data-nova-accent="accentId"
  >

    <NovaTopBar />

    <Background/>

    <DesktopContent>
      <slot/>
    </DesktopContent>

    <CoreApplicationRender/>

    <DockBar v-if="appConfig.desktop?.dockBar?.enabled" />

    <NovaLauncherOverlay
      v-if="startMenuOpen && useFullscreenLauncher"
    />

  </CoreDesktop>
</template>

<style lang="scss">
@use '../assets/styles/index.scss';

.owd-desktop {
  background: var(--owd-surface-900);
  font-family: var(--owd-font-family), serif;
  color: var(--owd-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.owd-desktop__system-bar) {
    flex: 0 0 auto;
  }

  :deep(.owd-desktop__content) {
    flex: 1 1 auto;
    min-height: 0;
  }

  &--system-bar-position-bottom {
    flex-direction: column-reverse;
  }
}
</style>
