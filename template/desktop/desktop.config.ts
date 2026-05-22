import { defineDesktopConfig } from '@owdproject/core/runtime/utils/utilDesktop'

export default defineDesktopConfig({
    apps: ['@owdproject/app-about'],
    // modules: ['@owdproject/module-docs'],
    modules: [],
    theme: '@owdproject/theme-win95',
})
