import { defineDesktopConfig } from '@owdproject/nuxt'

export default defineDesktopConfig({
  theme: '@dxlliv/owd-nuxt-theme-win95',
  modules: ['@owdproject/nuxt-persistence-pinia', '@owdproject/module-fs'],
  jazz: {
    broadcastOnly: true
  }
})
