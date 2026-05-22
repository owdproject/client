import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configAppAbout from './app.config'

export default defineNuxtPlugin({
  name: 'owd-app-about-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configAppAbout)
  },
})
