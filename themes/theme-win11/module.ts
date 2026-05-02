import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  installModule,
  addImportsDir,
  addPlugin,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core/runtime/utils/utilApp'
import deepMerge from 'deepmerge'

export default defineNuxtModule({
  meta: {
    name: 'owd-theme-win11',
    configKey: 'desktop',
  },
  defaults: {
    name: 'win11',
    systemBar: {
      enabled: false,
      position: 'bottom',
      startButton: false,
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    await installModule('@owdproject/kit-theme')

    nuxt.options.runtimeConfig.public.desktop = deepMerge(
      nuxt.options.runtimeConfig.public.desktop,
      options,
    )

    addComponentsDir({
      path: resolve('./runtime/components'),
    })

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )
    registerTailwindPath(nuxt, resolve('./runtime/pages/**/*.{vue,mjs,ts}'))

    nuxt.hook('i18n:registerModule', (register) => {
      register({
        langDir: resolve('./i18n'),
        locales: [
          {
            code: 'en',
            file: 'locales/en.ts',
          },
        ],
      })
    })

    addImportsDir(resolve('./runtime/composables'))

    addPlugin({
      src: resolve('./runtime/plugins/50.owd-theme-win11-dialogs.client.ts'),
      mode: 'client',
    })

    if (nuxt.options.modules.includes('@owdproject/module-fs')) {
      await installModule('@owdproject/kit-fs')
      await installModule('@owdproject/app-explorer')
    }

    nuxt.options.nitro.publicAssets = [
      {
        dir: resolve('./public'),
      },
    ]
  },
})
