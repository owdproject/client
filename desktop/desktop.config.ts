import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-win11',
  apps: ['@owdproject/app-about', '@owdproject/app-todo'],
  modules: [],
})
