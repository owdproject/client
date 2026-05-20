<script setup lang="ts">
import { useNovaStartMenu } from '../../composables/useNovaStartMenu'

const { open, useFullscreenLauncher, toggleDockLauncher } = useNovaStartMenu()

const active = computed(
  () => open.value && useFullscreenLauncher.value,
)
</script>

<template>
  <DockBarButton
    class="owd-dock-bar__button-menu"
    :class="{ 'owd-dock-bar__button-menu--active': active }"
    :aria-expanded="active"
    aria-haspopup="dialog"
    :aria-label="$t('systemBar.launcher.panelLabel')"
    @click.stop="toggleDockLauncher()"
  >
    <Icon name="lucide:grip" :size="32" />
  </DockBarButton>
</template>

<style scoped lang="scss">
.owd-dock-bar__button-menu {
  &--active {
    opacity: 1;
    background: rgba(26, 108, 175, 0.35);
    border-radius: 12px;
  }
}
</style>
