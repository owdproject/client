import {defineDesktopConfig} from "./core/runtime/utils/utilsDesktop"

export default defineDesktopConfig({
    apps: [
        './dev/apps/app-about',
        './dev/apps/app-todo',
        './dev/apps/app-debug',
        './dev/apps/app-wasmboy',
    ]
})