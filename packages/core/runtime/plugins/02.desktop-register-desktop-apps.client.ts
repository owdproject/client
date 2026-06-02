import { defineNuxtPlugin } from 'nuxt/app'
import { flushPendingDesktopApps } from '../utils/utilDesktop'

export default defineNuxtPlugin({
  name: 'desktop-register-desktop-apps',
  dependsOn: ['pinia', 'desktop-shell-init'],
  enforce: 'post',
  setup(nuxtApp) {
    nuxtApp.hook('app:created', async () => {
      await flushPendingDesktopApps()
    })
  },
})
