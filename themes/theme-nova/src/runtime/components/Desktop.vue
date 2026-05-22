<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useAppConfig } from 'nuxt/app'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import NovaTopBar from './NovaTopBar.vue'
import NovaLauncherOverlay from './NovaLauncherOverlay.vue'
import NovaWorkspaceStack from './NovaWorkspaceStack.vue'
import NovaWorkspaceEdgeHints from './NovaWorkspaceEdgeHints.vue'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import { useNovaAccentTheme } from '../composables/useNovaAccentTheme'
import { useNovaWorkspaces } from '../composables/useNovaWorkspaces'

const { open: startMenuOpen, close: closeStartMenu } = useNovaStartMenu()
const { accentId } = useNovaAccentTheme()
const { enabled: workspacesEnabled } = useNovaWorkspaces()

const props = defineProps<{
  systemBar?: DesktopSystemBarConfig
}>()

const appConfig = useAppConfig()
const desktopWorkspaceStore = useDesktopWorkspaceStore()

const BODY_SHELL_CLASS = 'owd-has-nova-desktop'

watch(
  accentId,
  (id) => {
    if (!import.meta.client) return
    document.body.setAttribute('data-nova-accent', id)
  },
  { immediate: true },
)

watch(startMenuOpen, (isOpen) => {
  if (isOpen && desktopWorkspaceStore.overview) {
    desktopWorkspaceStore.setOverview(false)
  }
})

watch(
  () => desktopWorkspaceStore.overview,
  (isOpen) => {
    if (isOpen) closeStartMenu()
  },
)

onMounted(() => {
  document.body.classList.add(BODY_SHELL_CLASS)
})

onUnmounted(() => {
  document.body.classList.remove(BODY_SHELL_CLASS)
  document.body.removeAttribute('data-nova-accent')
})
</script>

<template>
  <CoreDesktop
    v-bind="$props"
    :workspaces="appConfig.desktop?.workspaces"
    class="owd-desktop--nova"
    :class="{
      'owd-desktop--overview-enabled': desktopWorkspaceStore.overview,
    }"
    :data-nova-accent="accentId"
  >

    <NovaTopBar />

    <NovaWorkspaceEdgeHints v-if="workspacesEnabled" />

    <div class="nova-shell__stage">
      <Background />

      <NovaWorkspaceStack v-if="workspacesEnabled">
        <slot />
      </NovaWorkspaceStack>

      <template v-else>
        <DesktopContent>
          <slot />
        </DesktopContent>
        <CoreApplicationRender />
      </template>
    </div>

    <DockBar v-if="appConfig.desktop?.dockBar?.enabled" />

    <NovaLauncherOverlay v-if="startMenuOpen" />

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
    overflow: visible;
    position: relative;
    z-index: 10061;
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
