<script setup lang="ts">
import { useSystemBar } from '../composables/useSystemBar'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useBlockNonInputContextMenu } from '@owdproject/kit-theme/runtime/composables/useBlockNonInputContextMenu'

const systemBar = useSystemBar()
const { shuttingDown } = useDesktopSession()

useBlockNonInputContextMenu()
</script>

<template>
  <CoreDesktop v-bind="$props">
    <Background />

    <DesktopContent>
      <slot />
    </DesktopContent>

    <CoreApplicationRender />
    <SystemBar
      v-if="systemBar?.enabled.value"
    />

    <DesktopShutdown
      :active="shuttingDown"
    />
  </CoreDesktop>
</template>

<style lang="scss">
@use '../assets/styles/index.scss';

.owd-desktop {
  font-family: var(--owd-font-family), serif;
  font-size: var(--p-font-size);

  button {
    font-family: var(--owd-font-family), serif;
  }

  &__system-bar {
    &--position-bottom {
      flex-direction: column-reverse;
    }
  }
}
</style>
