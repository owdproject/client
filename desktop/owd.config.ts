import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  /** Switch to `@owdproject/theme-win95` when working on the classic shell. */
  theme: '@owdproject/theme-win11',
  apps: [
    '@owdproject/app-about',
      '@owdproject/app-todo'
],
  modules: [
    /**
     * ZenFS + kit-fs. With `@owdproject/theme-win11`, File Explorer is registered by the theme
     * (`runtime/apps/explorer`). Classic desktops still list `@owdproject/app-explorer` in `apps`.
     */
    '@owdproject/module-fs',
  ],
})
