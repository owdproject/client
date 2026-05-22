import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  modules: ['@owdproject/module-persistence'],
  apps: ['@owdproject/app-todo'],
  systemBar: { enabled: true, startButton: true },
})
