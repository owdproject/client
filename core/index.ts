import {defineNuxtModule, createResolver, addComponentsDir, addImportsDir, installModule, addPlugin} from '@nuxt/kit'
import {useDesktopManager} from './runtime/composables/useDesktopManager'
import pkg from './package.json'

export default defineNuxtModule({
    meta: {
        name: 'owd-core',
        priority: 9999,
    },
    async setup(options, nuxt) {
        const {resolve} = createResolver(import.meta.url)
        const desktopManager = useDesktopManager()

        await import(nuxt.options.rootDir + '/owd.config.ts')

        // set core version to runtime variables

        nuxt.options.runtimeConfig.public.coreVersion = pkg.version

        {

            // install open web desktop apps

            if (desktopManager.config.apps) {
                for (const appPath of desktopManager.config.apps) {
                    await installModule(appPath)
                }
            }

        }

        {

            // install primevue

            nuxt.options.primevue = nuxt.options.primevue || {};
            nuxt.options.primevue.options = nuxt.options.primevue.options || {};
            nuxt.options.primevue.options.theme = nuxt.options.primevue.options.theme || {};

            await installModule("@primevue/nuxt-module")

        }

        {

            // install tailwind

            const tailwindPaths = nuxt.options.runtimeConfig?.owd?.tailwindPaths || []
            tailwindPaths.push('./runtime/components/**/*.{vue,mjs,ts}')  // Aggiungi sempre questo al core

            nuxt.options.tailwindcss = nuxt.options.tailwindcss || {}
            nuxt.options.tailwindcss.config = nuxt.options.tailwindcss.config || {}
            // @ts-ignore
            nuxt.options.tailwindcss.config.content = tailwindPaths

            await installModule('@nuxtjs/tailwindcss', {
                viewer: false,
            })

        }

        {

            // install pinia

            await installModule("@pinia/nuxt")

        }

        {

            // install @nuxt/fonts

            await installModule("@nuxt/fonts")

        }

        {

            // install @nuxt/icon

            await installModule("@nuxt/icon", {
                clientBundle: {
                    scan: true,
                    sizeLimitKb: 256,
                },
            })

        }

        {

            // install @vueuse/nuxt

            await installModule("@vueuse/nuxt")

        }

        {

            // install @nuxtjs/i18n

            await installModule("@nuxtjs/i18n")

        }

        {

            // configure scss for vite

            nuxt.hook('vite:extendConfig', (viteConfig) => {
                viteConfig.css = viteConfig.css || {}
                viteConfig.css.preprocessorOptions = viteConfig.css.preprocessorOptions || {}
                viteConfig.css.preprocessorOptions.scss = {
                    api: 'modern-compiler',
                }
            })

        }

        {

            // add css

            nuxt.options.css.push('sanitize.css')

        }

        {

            // add components

            addComponentsDir({
                path: resolve("./runtime/components"),
                prefix: "",
                global: true,
            })

        }

        {

            // install plugins

            addPlugin(resolve('./runtime/plugins/resize.client.ts'))

            // add other files

            addImportsDir(resolve('./runtime/composables'))
            addImportsDir(resolve('./runtime/core'))
            addImportsDir(resolve('./runtime/stores'))
            addImportsDir(resolve('./runtime/utils'))

        }
    }
})

export * from './runtime/composables/useAppEntries'
export * from './runtime/composables/useApplicationManager'
export * from './runtime/composables/useApplicationState'
export * from './runtime/composables/useDesktopManager'
export * from './runtime/composables/useTerminalManager'
export * from './runtime/utils/utilsApp'
export * from './runtime/utils/utilsCommon'
export * from './runtime/utils/utilsDebug'
export * from './runtime/utils/utilsDesktop'
export * from './runtime/utils/utilsTerminal'
export * from './runtime/utils/utilsWindow'
export * from './runtime/stores/storeDesktop'
export * from './runtime/stores/storeDesktopVolume'
export * from './runtime/stores/storeDesktopWindow'
export * from './runtime/stores/storeDesktopWorkspace'
