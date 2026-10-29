import { defineDesktopConfig } from '@owdproject/nuxt'

export default defineDesktopConfig({
  theme: '@dxlliv/owd-theme-nuxt-win95',
  modules: ['@owdproject/module-nuxt-pinia-persistence', '@owdproject/module-nuxt-fs'],
  jazz: {
    broadcastOnly: true
  }
})
