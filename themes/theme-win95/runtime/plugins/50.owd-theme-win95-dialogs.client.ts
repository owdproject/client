import { defineNuxtPlugin } from 'nuxt/app'
import { useConfirm } from 'primevue/useconfirm'
import { OWD_DIALOG_PROVIDER_KEY } from '@owdproject/core/runtime/dialogs/owdDialogProvider'
import { createWin95OwdDialogs } from '../utils/createWin95OwdDialogs'

export default defineNuxtPlugin({
  name: 'owd-theme-win95-dialogs',
  enforce: 'post',
  setup(nuxtApp) {
    const confirm = useConfirm()
    nuxtApp.vueApp.provide(OWD_DIALOG_PROVIDER_KEY, createWin95OwdDialogs(confirm))
  },
})
