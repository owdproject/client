import {defineNuxtModule, createResolver, addComponentsDir, addImportsDir, installModule} from '@nuxt/kit'
import pkg from '../package.json'

export default defineNuxtModule({
    meta: {
        name: 'owd-core',
    },
    async setup(options, nuxt) {
        const {resolve} = createResolver(import.meta.url);

        // set core version to runtime variables

        nuxt.options.runtimeConfig.public.coreVersion = pkg.version

        // configure nuxt plugins

        nuxt.options.primevue = nuxt.options.primevue || {};
        nuxt.options.primevue.options = nuxt.options.primevue.options || {};
        nuxt.options.primevue.options.theme = nuxt.options.primevue.options.theme || {};

        {

            // install tailwind

            nuxt.options.modules.push('@nuxtjs/tailwindcss')
            await installModule("@nuxtjs/tailwindcss", {
                viewer: false,
            })

        }

        {

            // install primevue

            nuxt.options.modules.push('@primevue/nuxt-module')
            await installModule("@primevue/nuxt-module")

        }

        {

            // install pinia

            nuxt.options.modules.push('@pinia/nuxt')
            await installModule("@pinia/nuxt")

        }

        {

            // install @nuxt/fonts

            nuxt.options.modules.push('@nuxt/fonts')
            await installModule("@nuxt/fonts")

        }

        {

            // install @nuxt/icon

            nuxt.options.modules.push('@nuxt/icon')
            await installModule("@nuxt/icon", {
                clientBundle: {
                    scan: true,
                    sizeLimitKb: 256,
                },
            })

        }

        {

            // install @vueuse/nuxt

            nuxt.options.modules.push('@vueuse/nuxt')
            await installModule("@vueuse/nuxt")

        }

        {

            // install @nuxtjs/i18n

            nuxt.options.modules.push('@nuxtjs/i18n')
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

            // add runtime components

            addComponentsDir({
                path: resolve("./runtime/components"),
                prefix: "",
                global: true,
            })

        }

        {

            nuxt.options.plugins.push(
                resolve('./runtime/plugins/resize.client.ts'),
            )

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