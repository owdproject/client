import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-paper',
  apps: ['@owdproject/app-about', '@owdproject/app-todo', '@owdproject/app-soundcloud', '@owdproject/app-terminal', '@owdproject/app-dino', '@owdproject/app-debug', '@owdproject/app-wasmboy', '@owdproject/app-youtube', '@owdproject/app-classic-audioplayer', '@owdproject/app-twitch-chat', '@owdproject/app-classic-videoplayer', '@owdproject/app-slowroads'],
  modules: ['@owdproject/module-persistence', '@owdproject/module-fs'],
  jazz: {
    broadcastOnly: true
  }
})
