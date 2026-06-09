import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/kit/defineDesktopApp'
import config from './app.config'

export default defineNuxtPlugin({
  name: 'desktop-app-fixture-valid-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(config)
  },
})
