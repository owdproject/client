<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useBlockNonInputContextMenu } from '@owdproject/kit-theme/runtime/composables/useBlockNonInputContextMenu'

const applicationManager = useApplicationManager()
const { shuttingDown } = useDesktopSession()

useBlockNonInputContextMenu()

function openExplorer() {
  void applicationManager.launchAppEntry(
    'org.owdproject.explorer',
    'explorer',
    '/',
  )
}
</script>

<template>
  <CoreDesktop v-bind="$props">
    <div class="win11-shell flex flex-col h-full">
      <div class="win11-shell__workspace flex-1 min-h-0 relative">
        <CoreBackground />
        <div class="win11-shell__bloom" aria-hidden="true" />

        <DesktopContent>
          <slot />
        </DesktopContent>
      </div>

      <CoreApplicationRender />

      <nav class="win11-dock" aria-label="Taskbar">
        <button
          type="button"
          class="win11-dock__icon"
          aria-label="Explorer"
          @click="openExplorer"
        >
          <img src="/start.svg" alt="" />
        </button>
        <button type="button" class="win11-dock__icon" aria-label="Search">
          <img src="/search.webp" class="flipped" alt="" />
        </button>
      </nav>
    </div>

    <DesktopShutdown :active="shuttingDown" />
  </CoreDesktop>
</template>

<style scoped lang="scss">
.win11-shell__bloom {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: url('https://winblogs.thesourcemediaassets.com/sites/2/2021/10/Windows-11-Bloom-Screensaver-Dark-1600x900.jpg');
  background-size: cover;
  background-position: center;
}

.win11-dock {
  flex-shrink: 0;
  height: 45px;
  line-height: 40px;
  padding: 0 16px;
  backdrop-filter: blur(64px);
  border-top: 1px solid rgba(66, 66, 66, 0.2);
  background-color: rgba(27, 27, 27, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.win11-dock__icon {
  margin: 15px 3px;
  border-radius: 3px;
  transition:
    background 0.15s,
    border 0.15s;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.02px solid transparent;
  background: transparent;
  cursor: pointer;
}

.win11-dock__icon:hover {
  background: rgba(255, 255, 255, 0.05);
  border: 0.02px solid rgba(255, 255, 255, 0.07);
}

.win11-dock__icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  transition:
    width 0.1s,
    height 0.1s;
}

.win11-dock__icon img.flipped {
  transform: scaleX(-1);
}

.win11-dock__icon:active img {
  width: 20px;
  height: 20px;
}
</style>
