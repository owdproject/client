import { defineNuxtPlugin } from 'nuxt/app'
import {
  DESKTOP_DIALOG_PROVIDER_KEY,
  createBrowserFallbackDialogProvider,
} from '../dialogs/desktopDialogProvider'

export default defineNuxtPlugin({
  name: 'desktop-dialogs-fallback',
  setup(nuxtApp) {
    nuxtApp.vueApp.provide(
      DESKTOP_DIALOG_PROVIDER_KEY,
      createBrowserFallbackDialogProvider(),
    )
  },
})
