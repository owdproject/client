import { defineNuxtPlugin } from 'nuxt/app'
import {
  bindDesktopPinia,
  initDesktopShell,
  syncDesktopShellAppConfig,
} from '../utils/initDesktopShell'

export default defineNuxtPlugin({
  name: 'desktop-shell-init',
  dependsOn: ['pinia'],
  enforce: 'pre',
  setup(nuxtApp) {
    bindDesktopPinia(nuxtApp.$pinia)
    initDesktopShell()

    nuxtApp.hook('app:created', () => {
      syncDesktopShellAppConfig()
    })

    return {
      provide: {
        desktopShellReady: true,
      },
    }
  },
})
