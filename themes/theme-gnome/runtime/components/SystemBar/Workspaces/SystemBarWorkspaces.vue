<script setup>
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const desktopWorkspaceStore = useDesktopWorkspaceStore()

function toggleDesktopOverview() {
  desktopWorkspaceStore.setOverview(!desktopWorkspaceStore.overview)
}
</script>

<template>
  <SystemBarButton @click="toggleDesktopOverview">
    <div class="owd-system-bar__workspace-icon">
      <div
        class="owd-system-bar__workspace-icon__dot owd-system-bar__workspace-icon__dot--wide"
      />
      <div class="owd-system-bar__workspace-icon__dot" />
      <div class="owd-system-bar__workspace-icon__dot" />
    </div>
  </SystemBarButton>
</template>

<style scoped lang="scss">
.owd-system-bar__button {
  position: relative;
  top: -2px;
}
.owd-system-bar__workspace-icon {
  display: flex;
  align-items: center;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 4px;
    background-color: #ccc;
    margin-right: 6px;
    opacity: 0.6;

    &:last-child {
      margin-right: 4px;
    }

    &--wide {
      margin-left: 4px;
      margin-right: 8px;
      width: 24px;
      height: 7px;
      opacity: 1;
    }
  }
}
</style>
