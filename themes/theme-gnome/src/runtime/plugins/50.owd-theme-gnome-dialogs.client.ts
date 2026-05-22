import { defineNuxtPlugin } from 'nuxt/app'
import { useConfirm } from 'primevue/useconfirm'
import { OWD_DIALOG_PROVIDER_KEY } from '@owdproject/core/runtime/dialogs/owdDialogProvider'
import { createPrimeVueOwdDialogs } from '@owdproject/kit-theme/runtime/dialogs/createPrimeVueOwdDialogs'

export default defineNuxtPlugin({
  name: 'owd-theme-gnome-dialogs',
  enforce: 'post',
  setup(nuxtApp) {
    const confirm = useConfirm()
    nuxtApp.vueApp.provide(
      OWD_DIALOG_PROVIDER_KEY,
      createPrimeVueOwdDialogs(confirm),
    )
  },
})
