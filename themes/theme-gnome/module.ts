import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addPlugin,
  addImportsDir,
  installModule,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core/runtime/utils/utilApp'

export default defineNuxtModule({
  meta: {
    name: 'owd-theme-gnome',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const desktopConfig = require(resolve('./desktop.config.ts'))

    // assign open web desktop theme base config to runtime config
    nuxt.options.runtimeConfig.public.desktop = desktopConfig.default

    {
      // add components

      addComponentsDir({
        path: resolve('./runtime/components'),
      })
    }

    {
      // configure tailwind

      registerTailwindPath(
        nuxt,
        resolve('./runtime/components/**/*.{vue,mjs,ts}'),
      )
    }

    {
      // import i18n

      nuxt.hook('i18n:registerModule', (register) => {
        register({
          // langDir path needs to be resolved
          langDir: resolve('./i18n'),
          locales: [
            {
              code: 'en',
              file: 'locales/en.ts',
            },
          ],
        })
      })
    }

    {
      // add other files

      nuxt.options.css.push('vue3-carousel/dist/carousel.css')

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/consts'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
    }

    {
      if (nuxt.options.modules.includes('@owdproject/module-fs')) {
        await installModule('@owdproject/kit-explorer')
      }
    }
  },
})
