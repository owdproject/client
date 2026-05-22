<script setup lang="ts">
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const props = defineProps<{
  application: IApplicationController
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

function onApplicationClick() {
  const lastWindow = Array.from(props.application.windows.entries()).pop()

  if (lastWindow) {
    const lastWindowWorkspace = lastWindow[1].state.workspace

    desktopWorkspaceStore.setWorkspace(lastWindowWorkspace)
    desktopWorkspaceStore.setOverview(false)
  }
}
</script>

<template>
  <DockBarButton @click="onApplicationClick">
    <Icon
      v-if="application.config.icon"
      :name="application.config.icon"
      :size="48"
    />

    <div class="owd-dock-bar__windows">
      <div
        v-for="index in [...Array(application.windows.size).keys()]"
        class="owd-dock-bar__windows__window-dot"
      />
    </div>
  </DockBarButton>
</template>

<style scoped lang="scss">
.owd-dock-bar__windows {
  display: inline-flex;
  flex-direction: row;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  margin: 0 auto;
  gap: 3px;

  &__window-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: white;
    opacity: 0.8;
  }
}
</style>
