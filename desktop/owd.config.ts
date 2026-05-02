import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  /** Switch to `@owdproject/theme-win95` when working on the classic shell. */
  theme: '@owdproject/theme-win11',
  apps: [
    '@owdproject/app-about',
  ],
  modules: [
    /** ZenFS + themed explorer (`@owdproject/app-explorer`) when the active theme installs it. */
    '@owdproject/module-fs',
  ],
})
