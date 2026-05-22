import { nextTick } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const APP_ID = 'org.owdproject.about'
const WINDOW_MODEL = 'main'

/** Dev playground: open About after register + mount (same pattern as app-todo). */
export default defineNuxtPlugin({
  name: 'app-about-playground-launch',
  dependsOn: ['owd-app-about-register'],
  async setup(nuxtApp) {
    if (!import.meta.dev) return

    const applicationManager = useApplicationManager()

    async function surfaceAboutWindow() {
      if (!applicationManager.isAppDefined(APP_ID)) {
        return false
      }

      const app = applicationManager.getAppById(APP_ID)!

      if (app.storeWindows.$persistedState) {
        await app.storeWindows.$persistedState.isReady()
      }

      // Playground: drop stale minimized/hidden window state from prior sessions.
      app.closeAllWindows()
      app.storeWindows.windows = {}

      await applicationManager.execAppCommand(APP_ID, 'about')

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
        if (await surfaceAboutWindow()) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      console.warn(
        '[app-about playground] About app was not registered — check @owdproject/app-about plugin.',
      )
    })
  },
})
