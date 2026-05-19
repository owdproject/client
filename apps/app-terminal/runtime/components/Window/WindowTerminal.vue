<script setup lang="ts">
import Terminal from 'primevue/terminal'
import TerminalService from 'primevue/terminalservice'
import { useTerminalManager } from '@owdproject/core/runtime/composables/useTerminalManager'
import { useAppConfig } from 'nuxt/app'
import { onMounted, onBeforeUnmount } from 'vue'

const appConfig = useAppConfig()
const terminalManager = useTerminalManager()

const commandHandler = async (text) => {
  const response = await terminalManager.execCommand(text).catch((e) => {
    console.error(e)
    return
  })

  if (response && response.message) {
    TerminalService.emit('response', response.message)
  }
}

onMounted(() => {
  TerminalService.on('command', commandHandler)
})

onBeforeUnmount(() => {
  TerminalService.off('command', commandHandler)
})
</script>

<template>
  <Window>
    <Terminal
      :welcomeMessage="appConfig.terminal.welcomeMessage"
      :prompt="appConfig.terminal.prompt"
      aria-label="Terminal"
    />
  </Window>
</template>

<style scoped lang="scss">
.p-terminal {
  white-space: pre-wrap;
}
</style>
