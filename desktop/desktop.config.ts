import { defineDesktopConfig } from 'nuxt-desktop'

export default defineDesktopConfig({
  theme: '@owdproject/theme-win95',
  modules: ['@owdproject/nuxt-persistence-pinia', '@owdproject/module-fs'],
  jazz: {
    broadcastOnly: true
  }
})
