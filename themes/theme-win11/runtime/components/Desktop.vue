<script setup lang="ts">
import { onMounted } from 'vue'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import { isDebugMode } from '@owdproject/core/runtime/utils/utilDebug'

const applicationManager = useApplicationManager()
const { shuttingDown, initiateShutdownToStart } = useDesktopSession()
const { systemBarEnabled } = useDesktopShellOptions()

onMounted(() => {
  document.addEventListener('contextmenu', (event) => {
    if (isDebugMode()) return

    const tag = event.target.tagName.toLowerCase()
    const isInput =
      tag === 'input' ||
      tag === 'textarea' ||
      (event.target instanceof HTMLElement &&
        event.target.isContentEditable)

    if (!isInput) {
      event.preventDefault()
    }
  })
})

function openExplorer() {
  applicationManager.launchAppEntry(
    'org.owdproject.explorer',
    'explorer',
    '/',
  )
}
</script>

<template>
  <CoreDesktop v-bind="$props">
    <CoreBackground class="win11-bloom" />

    <DesktopContent>
      <slot />
    </DesktopContent>

    <CoreApplicationRender />

    <nav
      v-if="systemBarEnabled"
      class="win11-taskbar"
      aria-label="Taskbar"
    >
      <div class="win11-taskbar__inner">
        <button
          type="button"
          class="win11-taskbar__icon"
          @click="openExplorer"
        >
          <img
            src="/start.svg"
            alt=""
            width="24"
            height="24"
          />
        </button>
        <button
          type="button"
          class="win11-taskbar__icon"
          aria-label="Search"
        >
          <img
            src="/search.webp"
            class="flipped"
            alt=""
            width="24"
            height="24"
          />
        </button>
        <div class="win11-taskbar__spacer" />
        <button
          type="button"
          class="win11-taskbar__power"
          aria-label="Shut down"
          @click="initiateShutdownToStart"
        >
          ⏻
        </button>
      </div>
    </nav>

    <DesktopShutdown :active="shuttingDown" />
  </CoreDesktop>
</template>

<style lang="scss">
:deep(.win11-bloom .owd-background) {
  background-image: url('https://winblogs.thesourcemediaassets.com/sites/2/2021/10/Windows-11-Bloom-Screensaver-Dark-1600x900.jpg');
  background-size: cover;
  background-position: center;
}

.win11-taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999999999;
  height: 45px;
  line-height: 40px;
  padding: 0 16px;
  backdrop-filter: blur(64px);
  border-top: 1px solid rgba(66, 66, 66, 0.2);
  background-color: rgba(27, 27, 27, 0.7);
}

.win11-taskbar__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-width: 100%;
  gap: 6px;
}

.win11-taskbar__spacer {
  flex: 1;
}

.win11-taskbar__icon {
  margin: 0 3px;
  border-radius: 3px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.02px solid transparent;
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border 0.15s;
}

.win11-taskbar__icon:hover {
  background: rgba(255, 255, 255, 0.05);
  border: 0.02px solid rgba(255, 255, 255, 0.07);
}

.win11-taskbar__icon .flipped {
  transform: scaleX(-1);
}

.win11-taskbar__icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.win11-taskbar__power {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 18px;
  padding: 0 8px;
  border-radius: 4px;
}

.win11-taskbar__power:hover {
  background: rgba(255, 255, 255, 0.08);
}

.owd-desktop {
  font-family: var(--owd-font-family, 'Segoe UI', system-ui, sans-serif);
  font-size: var(--p-font-size);

  button {
    font-family: inherit;
  }

  &__system-bar--position-bottom {
    flex-direction: column-reverse;
  }
}
</style>
