import {defineNuxtModule, createResolver, addComponentsDir, addImportsDir, installModule, addPlugin} from '@nuxt/kit'
import {deepMerge} from './runtime/utils/utilCommon'
//import pkg from './package.json'

export default defineNuxtModule({
  meta: {
    name: 'owd-core',
    configKey: 'desktop',
  },
  defaults: {
    theme: '@owdproject/theme-win95',
    apps: [
      //'@owdproject/app-about',
    ],
  },
  async setup(_options, _nuxt) {
    const {resolve} = createResolver(import.meta.url)

    // set core version to runtime config

    //nuxt.options.runtimeConfig.public.coreVersion = pkg.version

    {

      // install open web desktop theme

      if (_options.theme) {
        await installModule(_options.theme)
      }

      // install open web desktop modules

      if (_options.modules) {
        for (const modulePath of _options.modules) {
          await installModule(modulePath)
        }
      }

      // install open web desktop apps

      if (_options.apps) {
        for (const appPath of _options.apps) {
          await installModule(appPath)
        }
      }

      // assign open web desktop config to runtime config
      _nuxt.options.runtimeConfig.public.desktop = deepMerge(
        _nuxt.options.runtimeConfig.public.desktop,
        _options
      )

    }

    {

      // install primevue

      _nuxt.options.primevue = _nuxt.options.primevue || {};
      _nuxt.options.primevue.options = _nuxt.options.primevue.options || {};
      _nuxt.options.primevue.options.theme = _nuxt.options.primevue.options.theme || {};

      await installModule("@primevue/nuxt-module")

    }

    {

      // install tailwind

      const tailwindPaths = _nuxt.options.runtimeConfig?.owd?.tailwindPaths || []
      tailwindPaths.push('./runtime/components/**/*.{vue,mjs,ts}')  // Aggiungi sempre questo al core

      _nuxt.options.tailwindcss = _nuxt.options.tailwindcss || {}
      _nuxt.options.tailwindcss.config = _nuxt.options.tailwindcss.config || {}
      // @ts-ignore
      _nuxt.options.tailwindcss.config.content = tailwindPaths

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

      _nuxt.hook('vite:extendConfig', (viteConfig) => {
        viteConfig.css = viteConfig.css || {}
        viteConfig.css.preprocessorOptions = viteConfig.css.preprocessorOptions || {}
        viteConfig.css.preprocessorOptions.scss = {
          api: 'modern-compiler',
        }
      })

    }

    {

      // add css

      _nuxt.options.css.push('sanitize.css')

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
