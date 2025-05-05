import {defineDesktopConfig} from "./core/runtime/utils/utilsDesktop"

export default defineDesktopConfig({
    theme: './dev/themes/theme-gnome',
    modules: [
        './docs',
        './dev/modules/module-atproto',
        './dev/modules/module-pinia-atproto',
    ],
    apps: [
        '@owdproject/app-about',
        '@owdproject/app-todo',
        '@owdproject/app-debug',
        '@owdproject/app-wasmboy',
        '@owdproject/app-atproto',
        './dev/apps/app-terminal',
        './dev/apps/app-gridsky',
        //'./dev/apps/app-atproto',
    ],
})