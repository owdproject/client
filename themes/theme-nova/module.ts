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
import Material from '@primeuix/themes/material'
import {
  NOVA_EXPLORER_QUICK_ACCESS_SEED,
  NOVA_EXPLORER_SPECIAL_FOLDERS,
} from './runtime/apps/explorerNav.defaults'

export default defineNuxtModule({
  meta: {
    name: 'owd-theme-nova',
    configKey: 'desktop',
  },
  defaults: {
    name: 'nova',
    systemBar: {
      enabled: true,
      position: 'top',
      startButton: true,
      /** compact = dropdown; fullscreen = overlay; responsive = overlay below 768px */
      launcherPresentation: 'responsive',
    },
    dockBar: {
      enabled: true,
      position: 'bottom',
    },
    explorer: {
      quickAccess: NOVA_EXPLORER_QUICK_ACCESS_SEED,
      quickAccessExtra: [],
      quickAccessOverride: [],
      specialFolders: NOVA_EXPLORER_SPECIAL_FOLDERS,
      specialFoldersExtra: [],
      specialFoldersOverride: [],
      mountLabels: {
        '/home': 'Local Disk',
      },
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    await installModule('@owdproject/kit-theme')

    nuxt.options.runtimeConfig.public.desktop = deepMerge(
      nuxt.options.runtimeConfig.public.desktop,
      options,
    )

    nuxt.options.primevue = nuxt.options.primevue || {}
    nuxt.options.primevue.options = {
      theme: {
        preset: Material,
      },
    }

    addComponentsDir({
      path: resolve('./runtime/components'),
      global: true,
    })

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )

    nuxt.hook('i18n:registerModule', (register) => {
      register({
        langDir: resolve('./i18n'),
        locales: [
          {
            code: 'en',
            file: 'locales/en.json',
          },
        ],
      })
    })

    addImportsDir(resolve('./runtime/composables'))
    addImportsDir(resolve('./runtime/consts'))
    addImportsDir(resolve('./runtime/stores'))
    addImportsDir(resolve('./runtime/utils'))

    addPlugin({
      src: resolve('./runtime/plugins/50.owd-theme-nova-dialogs.client.ts'),
      mode: 'client',
    })

    if (nuxt.options.modules.includes('@owdproject/module-fs')) {
      await installModule('@owdproject/kit-explorer')

      addPlugin({
        src: resolve('./runtime/apps/plugin.ts'),
        mode: 'client',
      })

      addComponentsDir({
        path: resolve('./runtime/apps/components'),
      })

      registerTailwindPath(
        nuxt,
        resolve('./runtime/apps/components/**/*.{vue,mjs,ts}'),
      )
    }
  },
})
