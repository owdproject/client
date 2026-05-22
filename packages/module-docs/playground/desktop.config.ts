import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: ['@owdproject/app-about'],
  modules: ['@owdproject/module-docs'],
  docs: {
    basePath: '/docs',
    title: 'Open Web Desktop',
  },
})
