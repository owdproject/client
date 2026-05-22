import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configAppWasmboy from './app.config'
import './stores/storeWasmboy'

export default defineNuxtPlugin({
  name: 'owd-app-wasmboy-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configAppWasmboy)
  },
})
