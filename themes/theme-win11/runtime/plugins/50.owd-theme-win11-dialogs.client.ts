import { defineNuxtPlugin } from 'nuxt/app'
import { useConfirm } from 'primevue/useconfirm'
import { OWD_DIALOG_PROVIDER_KEY } from '@owdproject/core/runtime/dialogs/owdDialogProvider'
import { createWin11OwdDialogs } from '../utils/createWin11OwdDialogs'

export default defineNuxtPlugin({
  name: 'owd-theme-win11-dialogs',
  enforce: 'post',
  setup(nuxtApp) {
    const confirm = useConfirm()
    nuxtApp.vueApp.provide(
      OWD_DIALOG_PROVIDER_KEY,
      createWin11OwdDialogs(confirm),
    )
  },
})
