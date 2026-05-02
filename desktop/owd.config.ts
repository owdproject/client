import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-win95',
  apps: [
    '@owdproject/app-about',
  ],
  modules: [
    /** ZenFS + themed explorer (`@owdproject/app-explorer`) when the active theme installs it. */
    '@owdproject/module-fs',
  ],
})
