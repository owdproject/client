import { defineDesktopConfig } from '@owdproject/nuxt'

export default defineDesktopConfig({
  theme: '@owdproject/nuxt-theme-win95',
  modules: ['@owdproject/nuxt-module-pinia-persistence', '@owdproject/nuxt-module-fs'],
  jazz: {
    broadcastOnly: true
  }
})
