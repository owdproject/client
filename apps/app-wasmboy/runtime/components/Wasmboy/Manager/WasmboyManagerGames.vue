<script setup lang="ts">
import { UseTimeAgo } from '@vueuse/components'
import { useWasmboy } from '../../../composables/useWasmboy'
import { useWasmboyLibrary } from '../../../composables/useWasmboyLibrary'
import { onBeforeMount, onBeforeUnmount } from 'vue'

const wasmboy = useWasmboy()
const wasmboyLibrary = useWasmboyLibrary()

onBeforeMount(async () => {
  await wasmboyLibrary.refreshGameList()
})

onBeforeUnmount(() => {
  wasmboyLibrary.resetGameList()
})

async function onGameSelect(game) {
  await wasmboy.loadGame(game.cartridgeRom)
  await wasmboy.playEmulator()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="wasmboyLibrary.list.value.length > 0"
      v-for="game of wasmboyLibrary.list.value"
      class="flex"
    >
      <div class="flex-1" v-if="game.cartridgeInfo">
        <div>
          <b v-text="game.cartridgeInfo.titleAsString" />
        </div>

        <UseTimeAgo
          v-if="game.cartridgeRom"
          v-slot="{ timeAgo }"
          :time="game.cartridgeRom.date"
        >
          {{ timeAgo }}
        </UseTimeAgo>
      </div>

      <div class="flex items-center">
        <ButtonGroup>
          <Button @click="onGameSelect(game)">
            <Icon name="mdi:upload" />
          </Button>

          <Button @click="wasmboyLibrary.removeGame(game.cartridgeInfo.header)">
            <Icon name="mdi:remove" />
          </Button>
        </ButtonGroup>
      </div>
    </div>
    <template v-else> There are no games available </template>
  </div>
</template>

<style scoped lang="scss"></style>
