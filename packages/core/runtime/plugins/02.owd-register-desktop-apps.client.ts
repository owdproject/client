import { setActivePinia } from 'pinia'
import { defineNuxtPlugin } from 'nuxt/app'
import { flushPendingDesktopApps } from '../utils/utilDesktop'

export default defineNuxtPlugin({
  name: 'owd-register-desktop-apps',
  dependsOn: ['pinia'],
  enforce: 'post',
  setup(nuxtApp) {
    nuxtApp.hook('app:created', async () => {
      if (nuxtApp.$pinia) {
        setActivePinia(nuxtApp.$pinia)
      }
      await flushPendingDesktopApps()
    })
  },
})
