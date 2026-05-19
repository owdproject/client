<script setup lang="ts">
import { useAppConfig } from 'nuxt/app'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

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
  >

    <!--
    <SystemBar v-if="appConfig.desktop?.systemBar?.enabled" />
    -->

    <Background/>

    <DesktopContent>
      <CoreApplicationRender/>
      <slot/>
    </DesktopContent>

    <DockBar v-if="appConfig.desktop?.dockBar?.enabled" />

  </CoreDesktop>
</template>

<style lang="scss">
@use '../assets/styles/index.scss';

.owd-desktop {
  background: var(--owd-surface-900);
  font-family: var(--owd-font-family), serif;
  color: var(--owd-color);
  overflow: hidden;

  /*
  display: flex;
  flex-direction: column;

  &__system-bar {
    flex: 0;

    &--position-bottom {
      flex-direction: column-reverse;
    }
  }

  &__workspace-container {
    flex: 1;
    overflow: hidden;
  }

   */
}
</style>
