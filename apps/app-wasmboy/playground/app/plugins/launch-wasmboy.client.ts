import { nextTick } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const APP_ID = 'org.owdproject.wasmboy'
const WINDOW_MODEL = 'main'

/**
 * Dev playground: open WasmBoy after the desktop app is registered and mounted.
 */
export default defineNuxtPlugin({
  name: 'app-wasmboy-playground-launch',
  dependsOn: ['owd-app-wasmboy-register'],
  async setup(nuxtApp) {
    if (!import.meta.dev) return

    const applicationManager = useApplicationManager()

    async function surfaceWasmboyWindow() {
      if (!applicationManager.isAppDefined(APP_ID)) {
        return false
      }

      const app = applicationManager.getAppById(APP_ID)!

      if (app.storeWindows.$persistedState) {
        await app.storeWindows.$persistedState.isReady()
      }

      app.closeAllWindows()
      app.storeWindows.windows = {}

      await applicationManager.execAppCommand(APP_ID, 'wasmboy')

      const window = app.getFirstWindowByModel(WINDOW_MODEL)
      if (window) {
        window.actions.setActive(true)
        window.actions.bringToFront()
      }

      return Boolean(window)
    }

    nuxtApp.hook('app:mounted', async () => {
      await nextTick()

      for (let attempt = 0; attempt < 80; attempt++) {
        if (await surfaceWasmboyWindow()) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      console.warn(
        '[app-wasmboy playground] WasmBoy app was not registered — check @owdproject/app-wasmboy plugin.',
      )
    })
  },
})
