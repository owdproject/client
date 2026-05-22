<script setup lang="ts">
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import { useNovaQuickSettings } from '../composables/useNovaQuickSettings'
import { useNovaWorkspaces } from '../composables/useNovaWorkspaces'

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { close: closeStartMenu } = useNovaStartMenu()
const { close: closeQuickSettings } = useNovaQuickSettings()
const { enabled } = useNovaWorkspaces()

function toggleOverview() {
  const next = !desktopWorkspaceStore.overview
  if (next) {
    closeStartMenu()
    closeQuickSettings()
  }
  desktopWorkspaceStore.setOverview(next)
}
</script>

<template>
  <button
    v-if="enabled"
    type="button"
    class="nova-tray-btn"
    :class="{ 'nova-tray-btn--active': desktopWorkspaceStore.overview }"
    :aria-pressed="desktopWorkspaceStore.overview"
    :aria-label="$t('systemBar.tray.workspaces')"
    @click="toggleOverview()"
  >
    <span class="nova-tray-workspace-icon" aria-hidden="true">
      <span class="nova-tray-workspace-icon__wide" />
      <span class="nova-tray-workspace-icon__dot" />
      <span class="nova-tray-workspace-icon__dot" />
    </span>
  </button>
</template>

<style scoped lang="scss">
.nova-tray-workspace-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &__wide {
    width: 18px;
    height: 6px;
    border-radius: 3px;
    background: currentColor;
    opacity: 0.95;
  }

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.45;
  }
}
</style>
