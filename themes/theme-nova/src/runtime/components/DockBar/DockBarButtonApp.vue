<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const props = defineProps<{
  application: IApplicationController
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

const openWindowCount = computed(
  () => props.application.openWindowCount.value,
)

function getDockTargetWindow(): IWindowController | undefined {
  const windows = [...props.application.windows.values()]
  if (windows.length === 0) return undefined

  const focused = windows.find((w) => w.state.focused && w.state.active)
  if (focused) return focused

  const active = windows.find((w) => w.state.active)
  if (active) return active

  return windows[windows.length - 1]
}

const isDockActive = computed(() =>
  [...props.application.windows.values()].some(
    (w) => w.state.active && w.state.focused,
  ),
)

function onApplicationClick() {
  const window = getDockTargetWindow()
  if (!window) return

  desktopWorkspaceStore.setWorkspace(window.state.workspace)
  desktopWorkspaceStore.setOverview(false)

  if (window.state.active && window.state.focused) {
    window.actions.minimize()
    return
  }

  if (!window.state.active) {
    window.actions.setActive(true)
  }

  window.actions.bringToFront()
}
</script>

<template>
  <DockBarButton
    class="owd-dock-bar__button-app"
    :class="{ 'owd-dock-bar__button-app--active': isDockActive }"
    :title="application.config.title"
    @click="onApplicationClick"
  >
    <Icon
      v-if="application.config.icon"
      :name="application.config.icon"
      :size="24"
      class="owd-dock-bar__button-app__icon"
    />
    <Icon
      v-else
      name="mdi:application-outline"
      :size="24"
      class="owd-dock-bar__button-app__icon"
    />

    <div class="owd-dock-bar__windows">
      <div
          v-for="index in [...Array(openWindowCount).keys()]"
          class="owd-dock-bar__windows__window-dot"
      />
    </div>
  </DockBarButton>
</template>

<style scoped lang="scss">
.owd-dock-bar__button-app {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &--active {
    background: var(--nova-accent-muted, rgba(26, 108, 175, 0.35));
  }

  &__icon {
    flex-shrink: 0;
  }
}

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
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: white;
    opacity: 0.8;
  }
}
</style>
