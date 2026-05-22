import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configAppTerminal from './app.config'

export default defineNuxtPlugin({
  name: 'owd-app-terminal-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configAppTerminal)
  },
})
