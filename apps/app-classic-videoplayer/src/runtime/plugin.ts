import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configApp from './app.config'

export default defineNuxtPlugin({
  name: 'owd-app-classic-videoplayer-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configApp)
  },
})
