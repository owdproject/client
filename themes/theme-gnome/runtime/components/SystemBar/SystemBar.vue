<script setup>
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { computed } from '@vue/reactivity'
import { useWorkspaces } from '../../composables/useWorkspaces'

const desktopManager = useDesktopManager()
const desktopWorkspaceStore = useDesktopWorkspaceStore()
const workspaces = useWorkspaces()

const classes = computed(() => {
  const list = ['owd-desktop__system-bar']

  if (desktopWorkspaceStore.overview) {
    list.push('owd-desktop__system-bar--workspace-overview-enabled')
  }

  return list
})
</script>

<template>
  <div :class="classes">
    <div class="owd-desktop__system-bar__left">
      <SystemBarWorkspaces v-if="workspaces?.enabled" />
      <SystemBarApplicationsMenu />
    </div>

    <div class="owd-desktop__system-bar__middle">
      <SystemBarNotificationsMenu />
    </div>

    <div class="owd-desktop__system-bar__right">
      <SystemBarSettingsMenu />
    </div>
  </div>
</template>

<style scoped lang="scss">
.owd-desktop__system-bar {
  width: 100%;
  height: var(--p-system-bar-height);
  padding: var(--p-system-bar-padding);
  background: black;
  color: white;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  transition: background 0.2s ease-in-out;
  z-index: 3;

  &--workspace-overview-enabled {
    background: transparent;
  }

  > div {
    > div {
      display: inline-block;
    }
  }

  &__left {
    width: 20vw;

    .owd-system-bar__button {
      margin-right: 4px;
    }
  }

  &__middle {
    flex: 1;
    text-align: center;
  }

  &__right {
    width: 20vw;
    text-align: right;

    .owd-system-bar__button {
      margin-left: 4px;
    }

    a {
      font-size: 11px;

      .v-icon {
        display: inline-block;
        margin-top: -4px;
      }
    }
  }

  &__activities {
    @media (max-width: 800px) {
      display: none;
    }
  }
}
</style>
