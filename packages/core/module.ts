import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  installModule,
  addPlugin,
} from '@nuxt/kit'
import { deepMerge } from './runtime/utils/utilCommon'
import pkg from './package.json'

export default defineNuxtModule({
  meta: {
    name: 'owd-core',
  },
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

      _nuxt.options.runtimeConfig.public.desktop = {}

    // get open web desktop config

    const clientConfig = (
      await import(_nuxt.options.rootDir + '/owd.config.ts')
    ).default

    // extend nuxt.config.ts with owd.config.ts

    _nuxt.options = {
      ..._nuxt.options,
      ...clientConfig,
    }

    // set core version to runtime config

    _nuxt.options.runtimeConfig.public.coreVersion = pkg.version

    {
      // install open web desktop theme

      if (clientConfig.theme) {
        await installModule(clientConfig.theme)
      }

      // install open web desktop modules

      if (clientConfig.modules) {
        for (const modulePath of clientConfig.modules) {
          await installModule(modulePath)
        }
      }

      // install open web desktop apps

      if (clientConfig.apps) {
        for (const appPath of clientConfig.apps) {
          await installModule(appPath)
        }
      }

      // assign open web desktop config to runtime config
      _nuxt.options.runtimeConfig.public.desktop = deepMerge(
        _nuxt.options.runtimeConfig.public.desktop,
          clientConfig,
      )
    }

    {
      // install primevue

      _nuxt.options.primevue = _nuxt.options.primevue || {}
      _nuxt.options.primevue.options = _nuxt.options.primevue.options || {}
      _nuxt.options.primevue.options.theme =
        _nuxt.options.primevue.options.theme || {}

      await installModule('@primevue/nuxt-module')
    }

    {
      // install tailwind

      const tailwindPaths =
        _nuxt.options.runtimeConfig.app.owd?.tailwindPaths || []
      tailwindPaths.push('./runtime/components/**/*.{vue,mjs,ts}') // Aggiungi sempre questo al core

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

      await installModule('@pinia/nuxt')
    }

    {
      // install @nuxt/fonts

      await installModule('@nuxt/fonts')
    }

    {
      // install @nuxt/icon

      await installModule('@nuxt/icon', {
        clientBundle: {
          scan: true,
          sizeLimitKb: 256,
        },
      })
    }

    {
      // install @vueuse/nuxt

      await installModule('@vueuse/nuxt')
    }

    {
      // install @nuxtjs/i18n

      await installModule('@nuxtjs/i18n')
    }

    {
      // configure scss for vite

      _nuxt.hook('vite:extendConfig', (viteConfig) => {
        viteConfig.css = viteConfig.css || {}
        viteConfig.css.preprocessorOptions =
          viteConfig.css.preprocessorOptions || {}
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
        path: resolve('./runtime/components'),
        prefix: '',
        global: true,
      })
    }

    {
      addPlugin(resolve('./runtime/plugins/resize.client.ts'))

      // add other files

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/core'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
    }
  },
})
