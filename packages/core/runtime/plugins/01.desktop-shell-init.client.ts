import { defineNuxtPlugin } from 'nuxt/app'
import {
  bindDesktopPinia,
  initDesktopShell,
  syncDesktopShellAppConfig,
} from '../utils/initDesktopShell'
import { migratePersistedStoreIds } from '../utils/migratePersistedStoreIds'

export default defineNuxtPlugin({
  name: 'desktop-shell-init',
  dependsOn: ['pinia'],
  enforce: 'pre',
  setup(nuxtApp) {
    migratePersistedStoreIds()
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
