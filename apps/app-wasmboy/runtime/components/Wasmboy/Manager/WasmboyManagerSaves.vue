<script setup lang="ts">
import { UseTimeAgo } from '@vueuse/components'
import { useFileDialog } from '@vueuse/core'

import { useWasmboy } from '../../../composables/useWasmboy'
import { useWasmboyLibrary } from '../../../composables/useWasmboyLibrary'

const wasmboy = useWasmboy()
const wasmboyLibrary = useWasmboyLibrary()

async function onImportGameFile() {
  const { open, onChange } = useFileDialog({
    accept: '*',
  })

  open()

  onChange((files) => {
    if (files && files.length > 0) {
      wasmboyLibrary.importGameStatesBackupFromFile(files[0])
    }
  })
}

function onExportGameFile() {
  wasmboyLibrary.exportGameStatesBackupToFile()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <b class="-mb-2" v-text="`Backup Manager`" />
    Exports all game saves to a backup file.

    <div class="flex flex-row">
      <div class="w-1/2">
        <Button class="w-full" @click="onImportGameFile">
          Import backup
        </Button>
      </div>
      <div class="w-1/2">
        <Button class="w-full" @click="onExportGameFile">
          Export backup
        </Button>
      </div>
    </div>

    <Divider class="my-2" />

    <div
      v-if="wasmboyLibrary.currentGameStates.value.length > 0"
      v-for="save of wasmboyLibrary.currentGameStates.value"
      class="flex"
    >
      <div class="flex-1">
        <div>
          <b v-text="save.isAuto ? `GameSave (auto)` : 'GameSave'" />
        </div>

        <UseTimeAgo v-slot="{ timeAgo }" :time="save.date">
          {{ timeAgo }}
        </UseTimeAgo>
      </div>

      <div class="flex items-center opacity-30 pr-3">local</div>

      <div class="flex items-center">
        <ButtonGroup>
          <Button @click="wasmboy.restoreGameState(save)">
            <Icon name="mdi:upload" />
          </Button>

          <Button @click="wasmboyLibrary.removeGameState(save.date)">
            <Icon name="mdi:remove" />
          </Button>
        </ButtonGroup>
      </div>

      <!--
      <WasmboyCartridgeSaves
          :game="game"
      />
      -->
    </div>
    <template v-else> There are no saves available </template>
  </div>
</template>

<style scoped lang="scss"></style>
