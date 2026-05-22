import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: ['@owdproject/app-classic-videoplayer'],
  systemBar: { enabled: true, startButton: true },
})
