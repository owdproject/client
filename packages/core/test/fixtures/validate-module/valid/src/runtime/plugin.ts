import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import config from './app.config'

export default defineNuxtPlugin({
  name: 'owd-app-fixture-valid-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(config)
  },
})
