<script setup lang="ts">
import { useDocumentVisibility, useFileDialog } from '@vueuse/core'
import { onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import { computed } from '@vue/reactivity'
import { useWasmboy } from '../../composables/useWasmboy'
import { useWasmboyStore } from '../../stores/storeWasmboy'

const props = defineProps<{
  window: IWindowController
}>()

const visibility = useDocumentVisibility()

const wasmboy = useWasmboy()
const wasmboyCanvas: any = useTemplateRef('wasmboyCanvas')

const wasmboyStore = useWasmboyStore()

// window lifecycle

onMounted(async () => {
  if (!wasmboyCanvas.value) {
    return
  }

  if (wasmboyStore.$persistedState) {
    await wasmboyStore.$persistedState.isReady()
  }

  await wasmboy.setup(wasmboyCanvas.value, props.window)
  await wasmboy.restorePreviousGame()
})

onUnmounted(() => {
  wasmboy.resetEmulator()
})

watch(visibility, (newVisibility) => {
  if (newVisibility === 'visible') {
    if (!wasmboyStore.config.isPausedByPlayer && wasmboy.status.isPaused) {
      wasmboy.playEmulator()
    }
  }
})

// handle input file

const { open: onWasmboyRomSelect, onChange } = useFileDialog({
  accept: '.gb,.gbc,.gba,.zip',
  multiple: false,
})

onChange((files) => {
  wasmboy.insertCartridge(files[0])
})

/**
 * Open WasmBoy window manager
 */
function onWasmBoyWindowManagerOpen() {
  props.window.application.openWindow('manager')
}

const gameScreenSizeClass = computed(() => {
  switch (wasmboyStore.config.screenSize) {
    case 1.5:
      return 'game-screen--15'
    case 2:
      return 'game-screen--2'
    default:
      return 'game-screen'
  }
})
</script>

<template>
  <Window :window="window" class="owd-wasmboy">
    <template #nav-append>
      <ButtonWindowNav
        v-if="wasmboy.status.isLoaded"
        rounded
        title="WasmBoy Manager"
        @click="onWasmBoyWindowManagerOpen"
      >
        <Icon name="mdi:settings" />
      </ButtonWindowNav>

      <ButtonWindowNav rounded title="Load ROM" @click="onWasmboyRomSelect">
        <Icon name="mdi:eject" />
      </ButtonWindowNav>

      <ButtonWindowNav
        v-if="wasmboy.status.isLoaded"
        rounded
        :title="wasmboyStore.config.isPausedByPlayer ? 'Play' : 'Pause'"
        @click="wasmboy.togglePlayEmulator()"
      >
        <Icon
          :name="
            !wasmboyStore.config.isPausedByPlayer ? 'mdi:pause' : 'mdi:play'
          "
        />
      </ButtonWindowNav>
    </template>

    <canvas ref="wasmboyCanvas" :class="gameScreenSizeClass" />

    <div
      v-if="!wasmboy.status.isLoaded"
      class="owd-wasmboy__missing-rom cursor-pointer mt-2"
      title="Load ROM"
      @click="onWasmboyRomSelect"
    >
      <Icon name="solar:sd-card-bold" />
    </div>
  </Window>
</template>

<style scoped lang="scss">
:deep(.p-card) {
  width: fit-content !important;
  height: fit-content !important;
}

.owd-wasmboy {
  &__missing-rom {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 100px;
    opacity: 0.15;
  }

  &__actions {
    position: absolute;
    bottom: 32px;
    left: 0;
    right: 0;
    text-align: center;
    opacity: 1;

    .p-button {
      margin: 0 4px;

      .iconify {
        color: white;
      }
    }
  }

  &:hover {
    opacity: 1;
  }
}

.game-screen {
  pointer-events: none;
  width: 320px;
  height: 288px;

  &--15 {
    width: 480px;
    height: 432px;
  }

  &--2 {
    width: 640px;
    height: 576px;
  }
}
</style>
