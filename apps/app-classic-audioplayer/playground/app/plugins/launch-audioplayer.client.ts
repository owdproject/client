import { nextTick } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { openVfsFile } from '@owdproject/module-fs/runtime/utils/utilFsOpenFile'

const APP_ID = 'org.owdproject.classic-audioplayer'

export default defineNuxtPlugin({
  name: 'app-classic-audioplayer-playground-launch',
  dependsOn: ['owd-app-classic-audioplayer-register'],
  async setup(nuxtApp) {
    if (!import.meta.dev) return

    const applicationManager = useApplicationManager()

    async function runDemo() {
      if (!applicationManager.isAppDefined('org.owdproject.explorer')) return false
      await applicationManager.execAppCommand('org.owdproject.explorer', 'explorer /mnt/test')
      const opened = await openVfsFile('/mnt/test/demo.mp3')
      if (!opened && applicationManager.isAppDefined(APP_ID)) {
        await applicationManager.execAppCommand(APP_ID, "classic-audioplayer")
      }
      return true
    }

    nuxtApp.hook('app:mounted', async () => {
      await nextTick()
      for (let i = 0; i < 80; i++) {
        if (await runDemo()) return
        await new Promise((r) => setTimeout(r, 50))
      }
    })
  },
})
