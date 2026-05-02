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
      enabled: true,
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
    registerTailwindPath(
      nuxt,
      resolve('./runtime/pages/**/*.{vue,mjs,ts}'),
    )

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
    addImportsDir(resolve('./runtime/consts'))
    addImportsDir(resolve('./runtime/stores'))
    addImportsDir(resolve('./runtime/utils'))

    addPlugin({
      src: resolve('./runtime/plugins/50.owd-theme-win11-dialogs.client.ts'),
      mode: 'client',
    })

    nuxt.options.nitro = nuxt.options.nitro || {}
    nuxt.options.nitro.publicAssets = nuxt.options.nitro.publicAssets || []
    nuxt.options.nitro.publicAssets.push({
      dir: resolve('./public'),
    })

    if (nuxt.options.modules.includes('@owdproject/module-fs')) {
      await installModule('@owdproject/kit-fs')
      await installModule('@owdproject/app-explorer')
    }
  },
})
