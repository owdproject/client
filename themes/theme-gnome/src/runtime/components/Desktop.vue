<script setup lang="ts">
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useSystemBar } from '../composables/useSystemBar'
import { useWorkspaces } from '../composables/useWorkspaces'

const props = defineProps<{
  systemBar?: DesktopSystemBarConfig
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const systemBar = useSystemBar()
const workspaces = useWorkspaces()
</script>

<template>
  <CoreDesktop
    v-bind="$props"
    :class="{
      'owd-desktop--overview-enabled': desktopWorkspaceStore.overview,
    }"
  >
    <SystemBar v-if="systemBar?.enabled" />

    <div class="owd-desktop__search">
      <input placeholder="Type to search" />
    </div>

    <WorkspacesPreview v-if="workspaces?.enabled" />

    <Workspaces>
      <template v-slot="{ workspaceId }">
        <Background />

        <DesktopContent>
          <CoreApplicationRender
            :workspace-filter="workspaceId"
          />
          <slot />
        </DesktopContent>
      </template>
    </Workspaces>

    <div
      v-if="workspaces?.enabled"
      class="owd-desktop__dock-bar"
    >
      <DockBar />
    </div>
  </CoreDesktop>
</template>

<style lang="scss">
@use '../assets/styles/index.scss';

.owd-desktop {
  display: flex;
  flex-direction: column;
  background: var(--p-background-color);
  font-family: var(--p-font-family), serif;
  color: var(--p-color);

  &__system-bar {
    flex: 0;

    &--position-bottom {
      flex-direction: column-reverse;
    }
  }

  &__search {
    flex: 0;
    min-height: 50px;
    text-align: center;

    input {
      background: #383838;
      border: 0;
      border-radius: 24px;
      height: calc(100% - 16px);
      padding: 0 14px;
      margin: 8px;

      &::placeholder {
        color: white;
      }
    }
  }

  &__workspace-previews {
    flex: 0;
    padding: 12px 0;
  }

  &__workspace-container {
    flex: 1;
    overflow: hidden;
  }

  &__dock-bar {
    flex: 0;
  }
}
</style>
