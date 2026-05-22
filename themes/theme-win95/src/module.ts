import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  installModule,
  addImportsDir,
  addPlugin,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'
import deepMerge from 'deepmerge'

export default defineNuxtModule({
  meta: {
    name: 'owd-theme-win95',
    configKey: 'desktop'
  },
  defaults: {
    name: 'win95',
    systemBar: {
      enabled: true,
      position: 'bottom',
      startButton: true
    }
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    await installModule('@owdproject/kit-theme')

    // assign open web desktop theme base config to runtime config
    nuxt.options.runtimeConfig.public.desktop = deepMerge(
      nuxt.options.runtimeConfig.public.desktop,
      options,
    )

    {
      // add components

      addComponentsDir({
        path: resolve('./runtime/components')
      })
    }

    {
      // configure tailwind

      registerTailwindPath(nuxt, resolve('./runtime/components/**/*.{vue,mjs,ts}'))
      registerTailwindPath(nuxt, resolve('./runtime/pages/**/*.{vue,mjs,ts}'))
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
              file: 'locales/en.ts'
            }
          ]
        })
      })
    }

    {
      // add other files

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/consts'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
    }

    {
      addPlugin({
        src: resolve('./runtime/plugins/50.owd-theme-win95-dialogs.client.ts'),
        mode: 'client',
      })
    }

    {
      if (nuxt.options.modules.includes('@owdproject/module-fs')) {
        await installModule('@owdproject/kit-explorer')

        addPlugin({
          src: resolve('./runtime/apps/explorer/plugin.ts'),
          mode: 'client',
        })

        addComponentsDir({
          path: resolve('./runtime/apps/explorer/components'),
        })

        registerTailwindPath(
          nuxt,
          resolve('./runtime/apps/explorer/components/**/*.{vue,mjs,ts}'),
        )

        await installModule('@owdproject/app-classic-audioplayer')
        await installModule('@owdproject/app-classic-videoplayer')
      }
    }
  }
})
