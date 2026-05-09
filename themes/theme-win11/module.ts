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
import {
  WIN11_EXPLORER_QUICK_ACCESS_SEED,
  WIN11_EXPLORER_SPECIAL_FOLDERS,
} from './runtime/apps/explorer/explorerNav.defaults'

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
    workspaces: {
      enabled: true,
    },
    explorer: {
      quickAccess: WIN11_EXPLORER_QUICK_ACCESS_SEED,
      quickAccessExtra: [],
      quickAccessOverride: [],
      specialFolders: WIN11_EXPLORER_SPECIAL_FOLDERS,
      specialFoldersExtra: [],
      specialFoldersOverride: [],
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

    addPlugin({
      src: resolve('./runtime/apps/settings/plugin.ts'),
      mode: 'client',
    })

    addComponentsDir({
      path: resolve('./runtime/apps/settings/components'),
    })

    registerTailwindPath(
      nuxt,
      resolve('./runtime/apps/settings/components/**/*.{vue,mjs,ts}'),
    )

    if (nuxt.options.modules.includes('@owdproject/module-fs')) {
      /** Loads `@owdproject/kit-fs` automatically (see kit-explorer module). */
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
    }

    nuxt.options.nitro.publicAssets = [
      {
        dir: resolve('./public'),
      },
    ]
  },
})
