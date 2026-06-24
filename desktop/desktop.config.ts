import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: [ '@owdproject/app-about', '@owdproject/app-todo' ],
  modules: [ '@owdproject/module-fs', '@owdproject/module-persistence' ],
})
