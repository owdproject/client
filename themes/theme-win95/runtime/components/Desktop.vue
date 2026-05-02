<script setup lang="ts">
import { onMounted } from 'vue'
import { useSystemBar } from '../composables/useSystemBar'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { isDebugMode } from '@owdproject/core/runtime/utils/utilDebug'

const systemBar = useSystemBar()
const { shuttingDown } = useDesktopSession()

onMounted(() => {
  document.addEventListener("contextmenu", (event) => {
    if (isDebugMode()) return

    const tag = event.target.tagName.toLowerCase()
    const isInput = tag === 'input' || tag === 'textarea' || event.target.isContentEditable

    if (!isInput) {
      event.preventDefault()
    }
  })
})
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
