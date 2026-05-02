import { defineNuxtPlugin } from 'nuxt/app'
import {
  OWD_DIALOG_PROVIDER_KEY,
  createBrowserFallbackDialogProvider,
} from '../dialogs/owdDialogProvider'

export default defineNuxtPlugin({
  name: 'owd-dialogs-fallback',
  setup(nuxtApp) {
    nuxtApp.vueApp.provide(
      OWD_DIALOG_PROVIDER_KEY,
      createBrowserFallbackDialogProvider(),
    )
  },
})
