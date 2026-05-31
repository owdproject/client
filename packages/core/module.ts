import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  installModule,
  addPlugin
} from '@nuxt/kit'
import { defu } from 'defu'
import type { Nuxt } from '@nuxt/schema'
import { assertValidDesktopUserConfig } from './runtime/utils/validateDesktopUserConfig'
import {
  resolveDesktopConfigPath,
  warnLegacyDesktopConfig,
} from './runtime/utils/resolveDesktopConfigPath'
import { splitDesktopUserConfig } from './runtime/utils/splitDesktopUserConfig'
import pkg from './package.json'

function primevueModuleDependency(nuxt: Nuxt) {
  const existing = nuxt.options.primevue ?? {}
  const components = { ...(existing.components ?? {}) }
  const include = components.include
  if (
    include &&
    include !== '*' &&
    Array.isArray(include) &&
    !include.includes('ConfirmDialog')
  ) {
    components.include = [...include, 'ConfirmDialog']
  }

  return {
    defaults: defu(
      {
        options: { theme: {} },
        components,
      },
      existing,
    ),
  }
}

export default defineNuxtModule({
  meta: {
    name: 'desktop',
    configKey: 'owd',
  },
  defaults: {
    theme: '@owdproject/theme-nova',
    apps: [],
    modules: [],
  },
  moduleDependencies: (nuxt) => ({
    '@pinia/nuxt': {},
    '@primevue/nuxt-module': primevueModuleDependency(nuxt),
    '@nuxt/fonts': {},
    '@nuxt/icon': {
      defaults: {
        clientBundle: {
          scan: true,
          sizeLimitKb: 256,
        },
      },
    },
    '@vueuse/nuxt': {},
    '@nuxtjs/i18n': {},
  }),
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Required for Nuxt 4 dev (playgrounds, module graphs): avoids
    // "Vite Node IPC socket path not configured" when using @nuxt/kit pipelines.
    _nuxt.options.experimental = {
      ..._nuxt.options.experimental,
      viteEnvironmentApi:
        _nuxt.options.experimental?.viteEnvironmentApi ?? true,
    }

    _nuxt.options.runtimeConfig.public.desktop = {}

    // get open web desktop config (desktop.config.ts; owd.config.ts legacy)

    let clientConfig

    const resolvedConfig = resolveDesktopConfigPath(_nuxt.options.rootDir)

    if (!resolvedConfig) {
      const hint =
        'Create desktop.config.ts next to your Nuxt root (e.g. desktop/desktop.config.ts), export default defineDesktopConfig({ theme, apps, modules }).'
      throw new Error(`[@owdproject/core] Cannot find desktop.config.ts in ${_nuxt.options.rootDir}. ${hint}`)
    }

    warnLegacyDesktopConfig(resolvedConfig)

    try {
      clientConfig = (await import(resolvedConfig.path)).default
    } catch (e) {
      const hint =
        'Export default defineDesktopConfig({ theme, apps, modules }) from desktop.config.ts.'
      throw new Error(
        `[@owdproject/core] Cannot load ${resolvedConfig.file}. ${hint}`,
        { cause: e },
      )
    }

    assertValidDesktopUserConfig(clientConfig, resolvedConfig.file)

    if (!clientConfig.theme) {
      clientConfig.theme = '@owdproject/theme-nova'
    }

    const {
      theme: configTheme,
      apps: configApps,
      modules: configModules,
      desktopRuntime,
    } = splitDesktopUserConfig(
      clientConfig as Record<string, unknown>,
      resolvedConfig.file,
    )

    clientConfig.theme = configTheme ?? clientConfig.theme
    if (configApps) clientConfig.apps = configApps
    if (configModules) clientConfig.modules = configModules

    // init desktop runtime config and define core version

    _nuxt.options.runtimeConfig.public.desktop = defu(
      desktopRuntime,
      { coreVersion: pkg.version },
    )

    {
      // install open web desktop theme

      if (clientConfig.theme) {
        await installModule(clientConfig.theme)
      }

      // install open web desktop modules

      if (clientConfig.modules && Array.isArray(clientConfig.modules)) {
        for (const modulePath of clientConfig.modules) {
          await installModule(modulePath)
        }
      }

      // install open web desktop apps

      if (clientConfig.apps && Array.isArray(clientConfig.apps)) {
        for (const appPath of clientConfig.apps) {
          await installModule(appPath)
        }
      }

    }

    // assign runtimeConfig desktop prop to appConfig
    // to make it overwritable by components later
    // via useDesktopManager
    _nuxt.options.appConfig.desktop = _nuxt.options.runtimeConfig.public.desktop

    {
      // Tailwind after theme/apps so registerTailwindPath paths are collected first.

      const tailwindPaths =
        _nuxt.options.runtimeConfig.app.owd?.tailwindPaths || []
      tailwindPaths.push('./runtime/components/**/*.{vue,mjs,ts}') // Aggiungi sempre questo al core

      _nuxt.options.tailwindcss = _nuxt.options.tailwindcss || {}
      _nuxt.options.tailwindcss.config = _nuxt.options.tailwindcss.config || {}
      // @ts-ignore
      _nuxt.options.tailwindcss.config.content = tailwindPaths

      await installModule('@nuxtjs/tailwindcss', {
        viewer: false
      })
    }

    {
      // configure scss for vite

      _nuxt.hook('vite:extendConfig', (viteConfig) => {
        viteConfig.css = viteConfig.css || {}
        viteConfig.css.preprocessorOptions =
          viteConfig.css.preprocessorOptions || {}
        viteConfig.css.preprocessorOptions.scss = {
          api: 'modern-compiler'
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
        pathPrefix: false,
        global: true
      })
    }

    {
      addPlugin(resolve('./runtime/plugins/resize.client.ts'))
      addPlugin(
        resolve('./runtime/plugins/02.desktop-register-desktop-apps.client.ts'),
      )

      // add other files

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
    }
  }
})
